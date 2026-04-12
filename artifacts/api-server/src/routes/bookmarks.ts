import { Router } from "express";
import { db, bookmarks, tasks } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/bookmarks", requireAuth, async (req, res) => {
  try {
    const userId = req.dbUser!.id;
    const rows = await db.select().from(bookmarks).where(eq(bookmarks.userId, userId));
    if (!rows.length) {
      res.json([]);
      return;
    }
    const result = await Promise.all(
      rows.map((b) => db.query.tasks.findFirst({ where: eq(tasks.id, b.taskId) }))
    );
    res.json(result.filter(Boolean));
  } catch (err) {
    req.log.error({ err }, "Error fetching bookmarks");
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
});

router.post("/bookmarks/:taskId", requireAuth, async (req, res) => {
  try {
    const userId = req.dbUser!.id;
    const { taskId } = req.params;

    const existing = await db.query.bookmarks.findFirst({
      where: and(eq(bookmarks.userId, userId), eq(bookmarks.taskId, taskId)),
    });
    if (existing) {
      res.json({ bookmarked: true });
      return;
    }
    await db.insert(bookmarks).values({ userId, taskId });
    res.json({ bookmarked: true });
  } catch (err) {
    req.log.error({ err }, "Error adding bookmark");
    res.status(500).json({ error: "Failed to bookmark task" });
  }
});

router.delete("/bookmarks/:taskId", requireAuth, async (req, res) => {
  try {
    const userId = req.dbUser!.id;
    const { taskId } = req.params;
    await db.delete(bookmarks).where(
      and(eq(bookmarks.userId, userId), eq(bookmarks.taskId, taskId))
    );
    res.json({ bookmarked: false });
  } catch (err) {
    req.log.error({ err }, "Error removing bookmark");
    res.status(500).json({ error: "Failed to remove bookmark" });
  }
});

router.get("/bookmarks/check/:taskId", requireAuth, async (req, res) => {
  try {
    const userId = req.dbUser!.id;
    const { taskId } = req.params;
    const existing = await db.query.bookmarks.findFirst({
      where: and(eq(bookmarks.userId, userId), eq(bookmarks.taskId, taskId)),
    });
    res.json({ bookmarked: !!existing });
  } catch (err) {
    res.status(500).json({ error: "Failed to check bookmark" });
  }
});

export default router;
