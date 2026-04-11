import { Router } from "express";
import { db, notifications } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;
    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, currentUser.id))
      .orderBy(sql`${notifications.createdAt} DESC`)
      .limit(50);
    const unreadCount = list.filter((n) => !n.isRead).length;
    res.json({ notifications: list, unreadCount });
  } catch (err) {
    req.log.error({ err }, "Error fetching notifications");
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.put("/notifications/read-all", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, currentUser.id), eq(notifications.isRead, false)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error marking notifications read");
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

router.put("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.id, req.params.id), eq(notifications.userId, currentUser.id)),
      );
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error marking notification read");
    res.status(500).json({ error: "Failed to update notification" });
  }
});

export default router;
