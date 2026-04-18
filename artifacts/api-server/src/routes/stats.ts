import { Router } from "express";
import { db, tasks, users } from "@workspace/db";
import { eq, sql, count, sum } from "drizzle-orm";

const router = Router();

// GET /stats — live platform statistics for the home page
router.get("/stats", async (_req, res) => {
  try {
    const [completedCount] = await db
      .select({ count: count(tasks.id) })
      .from(tasks)
      .where(eq(tasks.status, "completed"));

    const [paidOut] = await db
      .select({ total: sum(users.totalEarnings) })
      .from(users);

    const [activeCreators] = await db
      .select({ count: sql<number>`count(distinct ${tasks.creatorId})` })
      .from(tasks);

    const [openTasks] = await db
      .select({ count: count(tasks.id) })
      .from(tasks)
      .where(eq(tasks.status, "open"));

    res.json({
      completedTasks: completedCount?.count ?? 0,
      totalPaidOut: Math.abs(Number(paidOut?.total ?? 0)),
      activeCreators: Number(activeCreators?.count ?? 0),
      openTasks: openTasks?.count ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
