import { Router } from "express";
import { db, tasks, users } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;

    const postedTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        budget: tasks.budget,
        status: tasks.status,
        creatorId: tasks.creatorId,
        workerId: tasks.workerId,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .where(eq(tasks.creatorId, currentUser.id))
      .orderBy(sql`${tasks.createdAt} DESC`);

    const acceptedTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        budget: tasks.budget,
        status: tasks.status,
        creatorId: tasks.creatorId,
        workerId: tasks.workerId,
        createdAt: tasks.createdAt,
        creatorName: users.name,
        creatorEmail: users.email,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.creatorId, users.id))
      .where(eq(tasks.workerId, currentUser.id))
      .orderBy(sql`${tasks.createdAt} DESC`);

    res.json({
      postedTasks,
      acceptedTasks,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching dashboard");
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});

export default router;
