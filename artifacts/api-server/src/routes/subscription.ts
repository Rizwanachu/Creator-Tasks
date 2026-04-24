import { Router } from "express";
import { db, users, subscriptions } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import Razorpay from "razorpay";

const router = Router();

function getRazorpay() {
  const keyId = process.env["RAZORPAY_KEY_ID"];
  const keySecret = process.env["RAZORPAY_KEY_SECRET"];
  if (!keyId || !keySecret) throw new Error("Razorpay keys not configured");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function isProActive(user: { isPro: boolean | null; proUntil: Date | null }): boolean {
  if (!user.isPro) return false;
  if (!user.proUntil) return true;
  return user.proUntil > new Date();
}

router.get("/subscription", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;
    const user = await db.query.users.findFirst({ where: eq(users.id, currentUser.id) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, currentUser.id),
      orderBy: [desc(subscriptions.createdAt)],
    });

    res.json({
      isPro: isProActive(user),
      proUntil: user.proUntil ?? null,
      subscription: sub
        ? {
            id: sub.id,
            razorpaySubscriptionId: sub.razorpaySubscriptionId,
            status: sub.status,
            currentPeriodStart: sub.currentPeriodStart,
            currentPeriodEnd: sub.currentPeriodEnd,
            cancelledAt: sub.cancelledAt,
            createdAt: sub.createdAt,
          }
        : null,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching subscription");
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

router.post("/subscription/create", requireAuth, async (req, res) => {
  try {
    const planId = process.env["RAZORPAY_PRO_PLAN_ID"];
    if (!planId) {
      res.status(503).json({ error: "Pro plan not configured. Contact support." });
      return;
    }

    const currentUser = req.dbUser!;
    const user = await db.query.users.findFirst({ where: eq(users.id, currentUser.id) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    if (isProActive(user)) {
      res.status(409).json({ error: "You already have an active Pro subscription." });
      return;
    }

    const razorpay = getRazorpay();

    const subPayload: Record<string, unknown> = {
      plan_id: planId,
      total_count: 12,
      quantity: 1,
      notify_info: {
        notify_phone: null,
        notify_email: user.email ?? null,
      },
      notes: { userId: currentUser.id },
    };

    const sub = await (razorpay.subscriptions as any).create(subPayload);

    res.json({
      subscriptionId: sub.id,
      keyId: process.env["RAZORPAY_KEY_ID"],
    });
  } catch (err) {
    req.log.error({ err }, "Error creating subscription");
    if ((err as Error).message === "Razorpay keys not configured") {
      res.status(503).json({ error: "Payment system not configured" });
      return;
    }
    res.status(500).json({ error: "Failed to create subscription" });
  }
});

router.post("/subscription/cancel", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;

    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, currentUser.id),
      orderBy: [desc(subscriptions.createdAt)],
    });

    if (!sub || sub.status !== "active") {
      res.status(404).json({ error: "No active subscription found." });
      return;
    }

    if (sub.razorpaySubscriptionId) {
      try {
        const razorpay = getRazorpay();
        await (razorpay.subscriptions as any).cancel(sub.razorpaySubscriptionId, { cancel_at_cycle_end: 1 });
      } catch (rzErr) {
        req.log.warn({ rzErr }, "Razorpay cancel API failed — marking locally anyway");
      }
    }

    await db
      .update(subscriptions)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(eq(subscriptions.id, sub.id));

    res.json({ success: true, message: "Subscription cancelled. Pro access continues until the end of your billing period." });
  } catch (err) {
    req.log.error({ err }, "Error cancelling subscription");
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

export default router;
