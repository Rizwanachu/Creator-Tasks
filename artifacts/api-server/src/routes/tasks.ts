import { Router } from "express";
import { db, tasks, users, submissions, transactions } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

const CATEGORIES = ["reels", "hooks", "thumbnails", "other"] as const;
type Category = (typeof CATEGORIES)[number];

function isValidCategory(v: unknown): v is Category {
  return CATEGORIES.includes(v as Category);
}

router.get("/tasks", async (req, res) => {
  try {
    const { category } = req.query as { category?: string };

    const baseQuery = db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        budget: tasks.budget,
        category: tasks.category,
        status: tasks.status,
        revisionNote: tasks.revisionNote,
        creatorId: tasks.creatorId,
        workerId: tasks.workerId,
        createdAt: tasks.createdAt,
        creatorName: users.name,
        creatorClerkId: users.clerkId,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.creatorId, users.id));

    const allTasks = category && isValidCategory(category)
      ? await baseQuery.where(eq(tasks.category, category)).orderBy(sql`${tasks.createdAt} DESC`)
      : await baseQuery.orderBy(sql`${tasks.createdAt} DESC`);

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
        category: tasks.category,
        status: tasks.status,
        revisionNote: tasks.revisionNote,
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
      where: and(eq(submissions.taskId, id), eq(submissions.status, "pending")),
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
    const { title, description, budget, category } = req.body as {
      title?: string;
      description?: string;
      budget?: unknown;
      category?: unknown;
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

    const categoryVal: Category = isValidCategory(category) ? category : "other";

    const [task] = await db
      .insert(tasks)
      .values({
        title,
        description,
        budget: budgetNum,
        category: categoryVal,
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

    if (task.status !== "in_progress" && task.status !== "revision_requested") {
      res.status(400).json({ error: "Task is not in a submittable state" });
      return;
    }

    const existing = await db.query.submissions.findFirst({
      where: eq(submissions.taskId, id),
    });

    if (existing) {
      await db
        .update(submissions)
        .set({ content, status: "pending" })
        .where(eq(submissions.taskId, id));
    } else {
      await db.insert(submissions).values({ taskId: id, content });
    }

    const [updated] = await db
      .update(tasks)
      .set({ status: "submitted", revisionNote: null })
      .where(eq(tasks.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error submitting task");
    res.status(500).json({ error: "Failed to submit task" });
  }
});

// Sentinel — thrown inside transaction to force rollback with structured data
class ApproveError extends Error {
  constructor(public code: "INSUFFICIENT_BALANCE" | "NOT_SUBMITTED", public shortfall?: number, public available?: number) {
    super(code);
    this.name = "ApproveError";
  }
}

router.post("/tasks/:id/approve", requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const currentUser = req.dbUser!;

    // Fast pre-checks (no money moves yet)
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

    // Early UX balance check (non-atomic, fast feedback before any DB work)
    const posterPre = await db.query.users.findFirst({ where: eq(users.id, currentUser.id) });
    if (!posterPre || (posterPre.balance ?? 0) < task.budget) {
      const shortfall = task.budget - (posterPre?.balance ?? 0);
      res.status(402).json({
        error: `Insufficient wallet balance. You need ₹${shortfall} more to approve this task. Please top up your wallet first.`,
        required: task.budget,
        available: posterPre?.balance ?? 0,
      });
      return;
    }

    // ── Atomic transaction: all three guards inside ────────────────────────
    //
    //  GUARD 1 — Double-spend / idempotency:
    //    The WHERE status='submitted' conditional update is a PostgreSQL-level
    //    row lock. Only one concurrent request can flip 'submitted' → 'completed'.
    //    Any racing second request gets 0 rows back → throws ApproveError →
    //    rolls back, nothing deducted.
    //
    //  GUARD 2 — Balance atomicity:
    //    We re-read the poster's balance INSIDE the transaction AFTER the status
    //    lock is acquired. This eliminates the race window between the early
    //    check and the actual deduction.
    //
    //  GUARD 3 — Transaction integrity:
    //    status change + poster debit + worker credit + transaction log all
    //    happen in one atomic block. If any step throws, Drizzle rolls
    //    everything back — no partial state ever hits the DB.
    //
    const workerEarning = Math.floor(task.budget * 0.9);

    const approved = await db.transaction(async (tx) => {
      // Guard 1: atomic status lock
      const [updated] = await tx
        .update(tasks)
        .set({ status: "completed" })
        .where(and(eq(tasks.id, id), eq(tasks.status, "submitted")))
        .returning();

      if (!updated) throw new ApproveError("NOT_SUBMITTED");

      // Guard 2: re-check balance atomically inside transaction
      const [poster] = await tx
        .select({ balance: users.balance })
        .from(users)
        .where(eq(users.id, currentUser.id));

      const available = poster?.balance ?? 0;
      if (available < task.budget) {
        throw new ApproveError("INSUFFICIENT_BALANCE", task.budget - available, available);
      }

      // Guard 3: all money moves together or not at all
      await tx
        .update(users)
        .set({ balance: sql`${users.balance} - ${task.budget}` })
        .where(eq(users.id, currentUser.id));

      await tx
        .update(users)
        .set({ balance: sql`${users.balance} + ${workerEarning}` })
        .where(eq(users.id, task.workerId!));

      await tx.insert(transactions).values([
        { userId: currentUser.id, amount: -task.budget, type: "payment" },
        { userId: task.workerId!, amount: workerEarning, type: "earning" },
      ]);

      await tx
        .update(submissions)
        .set({ status: "approved" })
        .where(eq(submissions.taskId, id));

      return updated;
    });

    res.json(approved);
  } catch (err) {
    if (err instanceof ApproveError) {
      if (err.code === "NOT_SUBMITTED") {
        res.status(409).json({ error: "Task is not in a submitted state — it may have already been approved." });
        return;
      }
      if (err.code === "INSUFFICIENT_BALANCE") {
        res.status(402).json({
          error: `Insufficient wallet balance. You need ₹${err.shortfall} more to approve this task. Please top up your wallet first.`,
          required: (err.shortfall ?? 0) + (err.available ?? 0),
          available: err.available,
        });
        return;
      }
    }
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

router.post("/tasks/:id/request-revision", requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { note } = req.body as { note?: string };
    const currentUser = req.dbUser!;

    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (task.creatorId !== currentUser.id) {
      res.status(403).json({ error: "Only the creator can request a revision" });
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
      .set({ status: "revision_requested", revisionNote: note || null })
      .where(eq(tasks.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error requesting revision");
    res.status(500).json({ error: "Failed to request revision" });
  }
});

export default router;
