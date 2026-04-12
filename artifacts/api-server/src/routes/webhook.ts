import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { db, transactions, users } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.post("/razorpay", async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env["RAZORPAY_WEBHOOK_SECRET"];
    if (!webhookSecret) {
      req.log?.warn("RAZORPAY_WEBHOOK_SECRET not set — webhook ignored");
      res.status(200).json({ ok: true });
      return;
    }

    const signature = req.headers["x-razorpay-signature"] as string | undefined;
    if (!signature) {
      res.status(400).json({ error: "Missing signature" });
      return;
    }

    const rawBody = req.body as Buffer;
    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expected !== signature) {
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    const event = JSON.parse(rawBody.toString("utf8"));
    if (event.event !== "payment.captured") {
      res.status(200).json({ ok: true });
      return;
    }

    const payment = event?.payload?.payment?.entity;
    if (!payment) {
      res.status(200).json({ ok: true });
      return;
    }

    const paymentId: string = payment.id;
    const amountPaise: number = payment.amount;
    const userId: string | undefined = payment.notes?.userId;

    if (!userId || !paymentId || !amountPaise) {
      req.log?.warn({ paymentId, userId }, "Webhook: missing required fields");
      res.status(200).json({ ok: true });
      return;
    }

    const amountRupees = Math.floor(amountPaise / 100);

    // Idempotency — skip if already processed
    const existing = await db.query.transactions.findFirst({
      where: eq(transactions.paymentId, paymentId),
    });
    if (existing) {
      res.status(200).json({ ok: true, duplicate: true });
      return;
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) {
      req.log?.error({ userId, paymentId }, "Webhook: user not found");
      res.status(200).json({ ok: true });
      return;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ balance: sql`${users.balance} + ${amountRupees}` })
        .where(eq(users.id, userId));

      await tx.insert(transactions).values({
        userId,
        amount: amountRupees,
        type: "deposit",
        paymentId,
      });
    });

    req.log?.info({ userId, paymentId, amountRupees }, "Webhook: wallet credited");
    res.status(200).json({ ok: true });
  } catch (err) {
    req.log?.error({ err }, "Error processing Razorpay webhook");
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
