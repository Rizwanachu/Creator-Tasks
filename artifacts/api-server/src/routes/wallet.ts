import { Router } from "express";
import { db, transactions, users, withdrawals } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import Razorpay from "razorpay";
import crypto from "crypto";

const router = Router();

const TRANSACTION_DESCRIPTIONS: Record<string, string> = {
  earning: "Earnings received",
  fee: "Platform fee",
  deposit: "Wallet deposit",
  withdrawal: "Withdrawal requested",
  refund: "Escrow refunded",
};

function getRazorpay() {
  const keyId = process.env["RAZORPAY_KEY_ID"];
  const keySecret = process.env["RAZORPAY_KEY_SECRET"];
  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys not configured");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

router.get("/wallet", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;

    const user = await db.query.users.findFirst({
      where: eq(users.id, currentUser.id),
    });

    const userTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, currentUser.id))
      .orderBy(sql`${transactions.createdAt} DESC`);

    const normalizedTransactions = userTransactions.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      type: tx.type === "earning" ? "payment" : tx.type,
      status: "completed",
      description: TRANSACTION_DESCRIPTIONS[tx.type] ?? "Transaction",
      createdAt: tx.createdAt,
    }));

    const userWithdrawals = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.userId, currentUser.id))
      .orderBy(sql`${withdrawals.createdAt} DESC`);

    const withdrawalTransactions = userWithdrawals.map((w) => ({
      id: w.id,
      amount: w.amount,
      type: "withdrawal",
      status: w.status,
      description: `Withdrawal to ${w.upiId}`,
      createdAt: w.createdAt,
    }));

    const allTransactions = [...normalizedTransactions, ...withdrawalTransactions].sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );

    res.json({
      balance: user?.balance ?? 0,
      pendingBalance: user?.pendingBalance ?? 0,
      transactions: allTransactions,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching wallet");
    res.status(500).json({ error: "Failed to fetch wallet" });
  }
});

router.post("/wallet/deposit/create-order", requireAuth, async (req, res) => {
  try {
    const { amount } = req.body as { amount?: unknown };
    const amountNum = Number(amount);

    if (isNaN(amountNum) || amountNum < 100) {
      res.status(400).json({ error: "Minimum deposit is ₹100" });
      return;
    }

    const razorpay = getRazorpay();

    const order = await razorpay.orders.create({
      amount: amountNum * 100,
      currency: "INR",
      receipt: `dep_${Date.now()}`,
    });

    res.json({
      orderId: order.id,
      amount: amountNum,
      currency: "INR",
      keyId: process.env["RAZORPAY_KEY_ID"],
    });
  } catch (err) {
    req.log.error({ err }, "Error creating deposit order");
    if ((err as Error).message === "Razorpay keys not configured") {
      res.status(503).json({ error: "Payment system not configured" });
      return;
    }
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

router.post("/wallet/deposit/verify", requireAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body as {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
      };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ error: "Missing payment verification fields" });
      return;
    }

    const keySecret = process.env["RAZORPAY_KEY_SECRET"];
    if (!keySecret) {
      res.status(503).json({ error: "Payment system not configured" });
      return;
    }

    // Step 1: Verify the HMAC signature — proves the payment came from Razorpay
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      res.status(400).json({ error: "Invalid payment signature" });
      return;
    }

    const currentUser = req.dbUser!;

    // Step 2: Idempotency guard — reject replayed payment IDs to prevent double-crediting
    const existing = await db.query.transactions.findFirst({
      where: eq(transactions.paymentId, razorpay_payment_id),
    });
    if (existing) {
      const updatedUser = await db.query.users.findFirst({ where: eq(users.id, currentUser.id) });
      res.json({ success: true, balance: updatedUser?.balance ?? 0 });
      return;
    }

    // Step 3: Fetch the actual charged amount from Razorpay — never trust client-provided amount
    const razorpay = getRazorpay();
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (payment.status !== "captured" && payment.status !== "authorized") {
      res.status(400).json({ error: "Payment not completed" });
      return;
    }
    // Razorpay stores amount in paise; convert to rupees
    const amountNum = Math.floor(Number(payment.amount) / 100);
    if (amountNum <= 0) {
      res.status(400).json({ error: "Invalid payment amount" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ balance: sql`${users.balance} + ${amountNum}` })
        .where(eq(users.id, currentUser.id));

      await tx.insert(transactions).values({
        userId: currentUser.id,
        amount: amountNum,
        type: "deposit",
        paymentId: razorpay_payment_id,
      });
    });

    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, currentUser.id),
    });

    res.json({ success: true, balance: updatedUser?.balance ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Error verifying deposit");
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

router.post("/wallet/withdraw", requireAuth, async (req, res) => {
  try {
    const { amount, upiId } = req.body as { amount?: unknown; upiId?: string };
    const currentUser = req.dbUser!;

    if (!upiId || !upiId.trim()) {
      res.status(400).json({ error: "UPI ID is required" });
      return;
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum < 100) {
      res.status(400).json({ error: "Minimum withdrawal is ₹100" });
      return;
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, currentUser.id),
    });

    if (!user || (user.balance ?? 0) < amountNum) {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }

    const [updatedWallet] = await db.transaction(async (tx) => {
      const result = await tx
        .update(users)
        .set({ balance: sql`${users.balance} - ${amountNum}` })
        .where(and(eq(users.id, currentUser.id), sql`${users.balance} >= ${amountNum}`))
        .returning({ balance: users.balance });

      if (!result.length) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      await tx.insert(withdrawals).values({
        userId: currentUser.id,
        amount: amountNum,
        upiId: upiId.trim(),
        status: "pending",
      });

      return result;
    });

    res.json({ success: true, balance: updatedWallet.balance });
  } catch (err) {
    if ((err as Error).message === "INSUFFICIENT_BALANCE") {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }
    req.log.error({ err }, "Error processing withdrawal");
    res.status(500).json({ error: "Failed to process withdrawal" });
  }
});

export default router;
