import { Router } from "express";
import { db, ratings, tasks, users } from "@workspace/db";
import { eq, and, avg, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// POST /tasks/:id/rate — rate the other party after task completion
router.post("/tasks/:id/rate", requireAuth, async (req, res) => {
  try {
    const taskId = req.params.id as string;
    const { score, comment } = req.body as { score?: unknown; comment?: string };
    const currentUser = req.dbUser!;

    const scoreNum = Number(score);
    if (!score || isNaN(scoreNum) || scoreNum < 1 || scoreNum > 5) {
      res.status(400).json({ error: "Score must be between 1 and 5" });
      return;
    }

    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    if (task.status !== "completed") {
      res.status(400).json({ error: "Can only rate completed tasks" });
      return;
    }

    const isCreator = task.creatorId === currentUser.id;
    const isWorker = task.workerId === currentUser.id;
    if (!isCreator && !isWorker) {
      res.status(403).json({ error: "You were not part of this task" });
      return;
    }

    // Rate the other party
    const ratingForId = isCreator ? task.workerId! : task.creatorId;

    const existing = await db.query.ratings.findFirst({
      where: and(eq(ratings.taskId, taskId), eq(ratings.ratingBy, currentUser.id)),
    });
    if (existing) {
      res.status(409).json({ error: "You have already rated this task" });
      return;
    }

    const [inserted] = await db
      .insert(ratings)
      .values({ taskId, ratingBy: currentUser.id, ratingFor: ratingForId, score: scoreNum, comment: comment ?? null })
      .returning();

    res.status(201).json(inserted);
  } catch (err) {
    req.log.error({ err }, "Error submitting rating");
    res.status(500).json({ error: "Failed to submit rating" });
  }
});

// GET /users/:clerkId/ratings — get average rating + ratings list for a user
router.get("/users/:clerkId/ratings", async (req, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, req.params.clerkId as string),
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const list = await db
      .select()
      .from(ratings)
      .where(eq(ratings.ratingFor, user.id))
      .orderBy(ratings.createdAt);

    const avgResult = await db
      .select({ avg: avg(ratings.score), total: count(ratings.id) })
      .from(ratings)
      .where(eq(ratings.ratingFor, user.id));

    res.json({
      average: avgResult[0]?.avg ? parseFloat(String(avgResult[0].avg)).toFixed(1) : null,
      total: avgResult[0]?.total ?? 0,
      ratings: list,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching ratings");
    res.status(500).json({ error: "Failed to fetch ratings" });
  }
});

export default router;
