import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { db, transactions, users, subscriptions } from "@workspace/db";
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
    const eventName: string = event.event ?? "";

    // ── Subscription events ──────────────────────────────────────────────────
    if (eventName === "subscription.charged") {
      await handleSubscriptionCharged(req, event);
      res.status(200).json({ ok: true });
      return;
    }

    if (eventName === "subscription.cancelled" || eventName === "subscription.halted" || eventName === "subscription.completed") {
      await handleSubscriptionEnded(req, event, eventName);
      res.status(200).json({ ok: true });
      return;
    }

    // ── One-time payment (wallet deposit) ────────────────────────────────────
    if (eventName !== "payment.captured") {
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

    // Skip subscription payments that pass through payment.captured
    if (payment.description?.includes("subscription") || payment.notes?.subscriptionId) {
      res.status(200).json({ ok: true });
      return;
    }

    if (!userId || !paymentId || !amountPaise) {
      req.log?.warn({ paymentId, userId }, "Webhook: missing required fields");
      res.status(200).json({ ok: true });
      return;
    }

    const amountRupees = Math.floor(amountPaise / 100);

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

async function handleSubscriptionCharged(req: Request, event: any) {
  try {
    const subEntity = event?.payload?.subscription?.entity;
    const paymentEntity = event?.payload?.payment?.entity;
    if (!subEntity) return;

    const razorpaySubscriptionId: string = subEntity.id;
    const razorpayPlanId: string = subEntity.plan_id;
    const userId: string | undefined = subEntity.notes?.userId ?? paymentEntity?.notes?.userId;

    if (!userId) {
      req.log?.warn({ razorpaySubscriptionId }, "subscription.charged: missing userId in notes");
      return;
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) {
      req.log?.error({ userId, razorpaySubscriptionId }, "subscription.charged: user not found");
      return;
    }

    const periodStart = subEntity.current_start ? new Date(subEntity.current_start * 1000) : new Date();
    const periodEnd = subEntity.current_end ? new Date(subEntity.current_end * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ isPro: true, proUntil: periodEnd })
        .where(eq(users.id, userId));

      const existing = await tx.query.subscriptions.findFirst({
        where: eq(subscriptions.razorpaySubscriptionId, razorpaySubscriptionId),
      });

      if (existing) {
        await tx
          .update(subscriptions)
          .set({ status: "active", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd })
          .where(eq(subscriptions.razorpaySubscriptionId, razorpaySubscriptionId));
      } else {
        await tx.insert(subscriptions).values({
          userId,
          razorpaySubscriptionId,
          razorpayPlanId,
          status: "active",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        });
      }
    });

    req.log?.info({ userId, razorpaySubscriptionId, periodEnd }, "subscription.charged: Pro activated");
  } catch (err) {
    req.log?.error({ err }, "Error handling subscription.charged");
  }
}

async function handleSubscriptionEnded(req: Request, event: any, eventName: string) {
  try {
    const subEntity = event?.payload?.subscription?.entity;
    if (!subEntity) return;

    const razorpaySubscriptionId: string = subEntity.id;
    const userId: string | undefined = subEntity.notes?.userId;

    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.razorpaySubscriptionId, razorpaySubscriptionId),
    });

    if (sub) {
      await db
        .update(subscriptions)
        .set({ status: "cancelled", cancelledAt: new Date() })
        .where(eq(subscriptions.id, sub.id));

      // Keep proUntil intact — access continues until end of paid period
      // Only clear isPro if proUntil has already passed
      const now = new Date();
      if (sub.currentPeriodEnd && sub.currentPeriodEnd <= now) {
        const resolvedUserId = userId ?? sub.userId;
        await db.update(users).set({ isPro: false }).where(eq(users.id, resolvedUserId));
      }
    } else if (userId) {
      await db.update(users).set({ isPro: false, proUntil: null }).where(eq(users.id, userId));
    }

    req.log?.info({ razorpaySubscriptionId, eventName }, "Subscription ended");
  } catch (err) {
    req.log?.error({ err }, "Error handling subscription ended event");
  }
}

export default router;
