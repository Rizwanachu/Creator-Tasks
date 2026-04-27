import { Router } from "express";
import { db, pushDevices } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getVapidPublicKey } from "../lib/push";

const router = Router();

// GET /push/vapid-public-key — public, used by browser to subscribe
router.get("/push/vapid-public-key", (_req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

// POST /push/web-subscribe — register a browser push subscription
router.post("/push/web-subscribe", requireAuth, async (req, res) => {
  try {
    const user = req.dbUser!;
    const { endpoint, keys, userAgent } = (req.body ?? {}) as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
      userAgent?: string;
    };

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: "endpoint and keys are required" });
      return;
    }

    const existing = await db.query.pushDevices.findFirst({
      where: eq(pushDevices.endpoint, endpoint),
    });

    if (existing) {
      await db
        .update(pushDevices)
        .set({
          userId: user.id,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: userAgent ?? existing.userAgent,
          lastSeenAt: new Date(),
        })
        .where(eq(pushDevices.id, existing.id));
    } else {
      await db.insert(pushDevices).values({
        userId: user.id,
        kind: "web",
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent ?? null,
      });
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Error subscribing to web push");
    res.status(500).json({ error: "Failed to subscribe" });
  }
});

// POST /push/web-unsubscribe — remove a browser push subscription
router.post("/push/web-unsubscribe", requireAuth, async (req, res) => {
  try {
    const user = req.dbUser!;
    const { endpoint } = (req.body ?? {}) as { endpoint?: string };
    if (!endpoint) {
      res.status(400).json({ error: "endpoint is required" });
      return;
    }
    await db.delete(pushDevices).where(
      and(eq(pushDevices.endpoint, endpoint), eq(pushDevices.userId, user.id)),
    );
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Error unsubscribing");
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

// POST /push/expo-token — register an Expo push token
router.post("/push/expo-token", requireAuth, async (req, res) => {
  try {
    const user = req.dbUser!;
    const { token } = (req.body ?? {}) as { token?: string };
    if (!token) {
      res.status(400).json({ error: "token is required" });
      return;
    }
    const existing = await db.query.pushDevices.findFirst({
      where: and(eq(pushDevices.expoToken, token), eq(pushDevices.kind, "expo")),
    });
    if (existing) {
      await db
        .update(pushDevices)
        .set({ userId: user.id, lastSeenAt: new Date() })
        .where(eq(pushDevices.id, existing.id));
    } else {
      await db.insert(pushDevices).values({
        userId: user.id,
        kind: "expo",
        expoToken: token,
      });
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Error registering expo token");
    res.status(500).json({ error: "Failed to register token" });
  }
});

export default router;
