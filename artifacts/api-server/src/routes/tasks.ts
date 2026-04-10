import { Router } from "express";
import { db, tasks, users, submissions, transactions } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/tasks", async (req, res) => {
  try {
    const allTasks = await db
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
        creatorClerkId: users.clerkId,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.creatorId, users.id))
      .orderBy(sql`${tasks.createdAt} DESC`);

    res.json(allTasks);
  } catch (err) {
    req.log.error({ err }, "Error listing tasks");
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.get("/tasks/:id", async (req, res) => {
  try {
    const id = String(req.params.id);

    const [task] = await db
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
        creatorClerkId: users.clerkId,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.creatorId, users.id))
      .where(eq(tasks.id, id));

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.taskId, id),
    });

    let workerClerkId: string | null = null;
    if (task.workerId) {
      const worker = await db.query.users.findFirst({
        where: eq(users.id, task.workerId),
        columns: { clerkId: true },
      });
      workerClerkId = worker?.clerkId ?? null;
    }

    res.json({
      ...task,
      workerClerkId,
      submissionContent: submission?.content ?? null,
      submission: submission || null,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching task");
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

router.post("/tasks", requireAuth, async (req, res) => {
  try {
    const { title, description, budget } = req.body as {
      title?: string;
      description?: string;
      budget?: unknown;
    };

    if (!title || !description || !budget) {
      res.status(400).json({ error: "title, description, and budget are required" });
      return;
    }

    const budgetNum = Number(budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      res.status(400).json({ error: "budget must be a positive number" });
      return;
    }

    const [task] = await db
      .insert(tasks)
      .values({
        title,
        description,
        budget: budgetNum,
        creatorId: req.dbUser!.id,
      })
      .returning();

    res.status(201).json(task);
  } catch (err) {
    req.log.error({ err }, "Error creating task");
    res.status(500).json({ error: "Failed to create task" });
  }
});

router.post("/tasks/:id/accept", requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const currentUser = req.dbUser!;

    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (task.creatorId === currentUser.id) {
      res.status(400).json({ error: "You cannot accept your own task" });
      return;
    }

    const result = await db
      .update(tasks)
      .set({ workerId: currentUser.id, status: "in_progress" })
      .where(and(eq(tasks.id, id), eq(tasks.status, "open")))
      .returning();

    if (result.length === 0) {
      res.status(409).json({ error: "Task already taken or not available" });
      return;
    }

    res.json(result[0]);
  } catch (err) {
    req.log.error({ err }, "Error accepting task");
    res.status(500).json({ error: "Failed to accept task" });
  }
});

router.post("/tasks/:id/submit", requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { content } = req.body as { content?: string };
    const currentUser = req.dbUser!;

    if (!content) {
      res.status(400).json({ error: "content is required" });
      return;
    }

    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (task.workerId !== currentUser.id) {
      res.status(403).json({ error: "Only the assigned worker can submit" });
      return;
    }

    if (task.status !== "in_progress") {
      res.status(400).json({ error: "Task is not in progress" });
      return;
    }

    await db.insert(submissions).values({ taskId: id, content });

    const [updated] = await db
      .update(tasks)
      .set({ status: "submitted" })
      .where(eq(tasks.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error submitting task");
    res.status(500).json({ error: "Failed to submit task" });
  }
});

router.post("/tasks/:id/approve", requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const currentUser = req.dbUser!;

    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (task.creatorId !== currentUser.id) {
      res.status(403).json({ error: "Only the creator can approve" });
      return;
    }

    if (!task.workerId) {
      res.status(400).json({ error: "No worker assigned" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(tasks)
        .set({ status: "completed" })
        .where(and(eq(tasks.id, id), eq(tasks.status, "submitted")))
        .returning();

      if (!updated) {
        return null;
      }

      const workerEarning = Math.floor(task.budget * 0.9);
      const platformFee = task.budget - workerEarning;

      await tx
        .update(users)
        .set({ balance: sql`${users.balance} + ${workerEarning}` })
        .where(eq(users.id, task.workerId!));

      await tx.insert(transactions).values([
        { userId: task.workerId!, amount: workerEarning, type: "earning" },
        { userId: currentUser.id, amount: platformFee, type: "fee" },
      ]);

      await tx.update(submissions)
        .set({ status: "approved" })
        .where(eq(submissions.taskId, id));

      return updated;
    });

    if (!result) {
      res.status(409).json({ error: "Task is not in submitted state" });
      return;
    }

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error approving task");
    res.status(500).json({ error: "Failed to approve task" });
  }
});

router.post("/tasks/:id/reject", requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const currentUser = req.dbUser!;

    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (task.creatorId !== currentUser.id) {
      res.status(403).json({ error: "Only the creator can reject" });
      return;
    }

    if (task.status !== "submitted") {
      res.status(400).json({ error: "Task has not been submitted yet" });
      return;
    }

    await db.update(submissions)
      .set({ status: "rejected" })
      .where(eq(submissions.taskId, id));

    const [updated] = await db
      .update(tasks)
      .set({ status: "open", workerId: null })
      .where(eq(tasks.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error rejecting task");
    res.status(500).json({ error: "Failed to reject task" });
  }
});

export default router;
