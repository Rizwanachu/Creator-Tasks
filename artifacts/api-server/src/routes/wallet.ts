import { Router } from "express";
import { db, transactions, users, withdrawals, tasks, disputes } from "@workspace/db";
import { and, eq, sql, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { createNotification } from "../lib/notify";
import { isOwner } from "../lib/owner";
import Razorpay from "razorpay";
import crypto from "crypto";

const ADMIN_CLERK_ID = process.env["ADMIN_CLERK_ID"];

function isAdmin(user: { clerkId?: string; email?: string | null }) {
  if (ADMIN_CLERK_ID && user.clerkId === ADMIN_CLERK_ID) return true;
  return isOwner(user.email);
}

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

    const currentUser = req.dbUser!;

    const order = await razorpay.orders.create({
      amount: amountNum * 100,
      currency: "INR",
      receipt: `dep_${Date.now()}`,
      notes: { userId: currentUser.id, purpose: "wallet_deposit" },
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
    if (isNaN(amountNum) || amountNum < 80) {
      res.status(400).json({ error: "Minimum withdrawal is ₹80" });
      return;
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, currentUser.id),
    });

    if (!user || (user.balance ?? 0) < amountNum) {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }

    // Guard: must have completed at least 1 task to withdraw
    const [{ completedCount }] = await db
      .select({ completedCount: count() })
      .from(tasks)
      .where(and(eq(tasks.workerId, currentUser.id), eq(tasks.status, "completed")));
    if (completedCount < 1) {
      res.status(403).json({
        error: "You must complete at least 1 task before withdrawing earnings.",
      });
      return;
    }

    // Guard: no open disputes
    const [{ openDisputes }] = await db
      .select({ openDisputes: count() })
      .from(disputes)
      .where(and(eq(disputes.reportedBy, currentUser.id), eq(disputes.status, "open")));
    if (openDisputes > 0) {
      res.status(403).json({
        error: "You have open dispute(s). Withdrawals are blocked until all disputes are resolved.",
      });
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

    // Notify admin so the owner sees a bell alert in the header.
    try {
      const adminUser = ADMIN_CLERK_ID
        ? await db.query.users.findFirst({ where: eq(users.clerkId, ADMIN_CLERK_ID) })
        : await db.query.users.findFirst({ where: sql`LOWER(${users.email}) = LOWER(${process.env.OWNER_EMAIL ?? "rizwanachoo123@gmail.com"})` });
      if (adminUser && adminUser.id !== currentUser.id) {
        await createNotification(
          adminUser.id,
          "withdrawal_requested",
          `${currentUser.name ?? "A user"} requested a withdrawal of ₹${amountNum} to ${upiId.trim()}`,
        );
      }
    } catch {
      // notification is non-fatal
    }

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

// GET /admin/withdrawals — admin only: list all withdrawal requests
router.get("/admin/withdrawals", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;
    if (!isAdmin(currentUser)) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const list = await db
      .select({
        id: withdrawals.id,
        amount: withdrawals.amount,
        upiId: withdrawals.upiId,
        status: withdrawals.status,
        createdAt: withdrawals.createdAt,
        userId: withdrawals.userId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(withdrawals)
      .leftJoin(users, eq(withdrawals.userId, users.id))
      .orderBy(sql`${withdrawals.createdAt} DESC`);

    res.json(list);
  } catch (err) {
    req.log.error({ err }, "Error fetching admin withdrawals");
    res.status(500).json({ error: "Failed to fetch withdrawals" });
  }
});

// POST /admin/withdrawals/:id/mark-paid — admin only: mark a withdrawal as paid
router.post("/admin/withdrawals/:id/mark-paid", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;
    if (!isAdmin(currentUser)) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const [updated] = await db
      .update(withdrawals)
      .set({ status: "paid" })
      .where(and(eq(withdrawals.id, req.params.id as string), eq(withdrawals.status, "pending")))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Pending withdrawal not found" });
      return;
    }

    await createNotification(
      updated.userId,
      "withdrawal_paid",
      `Your withdrawal of ₹${updated.amount} has been paid to ${updated.upiId}.`,
    );

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error marking withdrawal paid");
    res.status(500).json({ error: "Failed to mark withdrawal as paid" });
  }
});

// POST /admin/withdrawals/:id/reject — admin only: reject and refund a withdrawal
router.post("/admin/withdrawals/:id/reject", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;
    if (!isAdmin(currentUser)) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const { reason } = req.body as { reason?: string };

    const updated = await db.transaction(async (tx) => {
      const [w] = await tx
        .update(withdrawals)
        .set({ status: "rejected" })
        .where(and(eq(withdrawals.id, req.params.id as string), eq(withdrawals.status, "pending")))
        .returning();

      if (!w) return null;

      // Refund the amount back to the user's wallet
      await tx
        .update(users)
        .set({ balance: sql`${users.balance} + ${w.amount}` })
        .where(eq(users.id, w.userId));

      return w;
    });

    if (!updated) {
      res.status(404).json({ error: "Pending withdrawal not found" });
      return;
    }

    await createNotification(
      updated.userId,
      "withdrawal_rejected",
      `Your withdrawal of ₹${updated.amount} was rejected${reason ? `: ${reason}` : ""}. The amount has been refunded to your wallet.`,
    );

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error rejecting withdrawal");
    res.status(500).json({ error: "Failed to reject withdrawal" });
  }
});

export default router;
