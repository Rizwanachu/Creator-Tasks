import { Router } from "express";
import { db, tasks, users, submissions, transactions, notifications } from "@workspace/db";
import { eq, and, sql, ilike, gte, lte, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { createNotification } from "../lib/notify";
import { processReferralRewards } from "../lib/referral-rewards";
import { isOwner } from "../lib/owner";
import {
  emailTaskAccepted,
  emailWorkSubmitted,
  emailTaskApproved,
  emailRevisionRequested,
} from "../lib/email";

const router = Router();

const CATEGORIES = ["reels", "hooks", "thumbnails", "other"] as const;
type Category = (typeof CATEGORIES)[number];

function isValidCategory(v: unknown): v is Category {
  return CATEGORIES.includes(v as Category);
}

router.get("/tasks", async (req, res) => {
  try {
    const {
      category,
      q,
      minBudget,
      maxBudget,
      sort = "newest",
      status,
    } = req.query as {
      category?: string;
      q?: string;
      minBudget?: string;
      maxBudget?: string;
      sort?: string;
      status?: string;
    };

    let query = db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        budget: tasks.budget,
        category: tasks.category,
        status: tasks.status,
        revisionNote: tasks.revisionNote,
        revisionCount: tasks.revisionCount,
        creatorId: tasks.creatorId,
        workerId: tasks.workerId,
        deadline: tasks.deadline,
        attachmentUrl: tasks.attachmentUrl,
        flagged: tasks.flagged,
        createdAt: tasks.createdAt,
        creatorName: users.name,
        creatorClerkId: users.clerkId,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.creatorId, users.id))
      .$dynamic();

    const conditions: ReturnType<typeof eq>[] = [];

    if (category && isValidCategory(category)) {
      conditions.push(eq(tasks.category, category) as any);
    }

    if (status) {
      conditions.push(eq(tasks.status, status) as any);
    }

    if (q && q.trim()) {
      const search = `%${q.trim()}%`;
      conditions.push(or(ilike(tasks.title, search), ilike(tasks.description, search)) as any);
    }

    if (minBudget) {
      const min = parseInt(minBudget);
      if (!isNaN(min)) conditions.push(gte(tasks.budget, min) as any);
    }

    if (maxBudget) {
      const max = parseInt(maxBudget);
      if (!isNaN(max)) conditions.push(lte(tasks.budget, max) as any);
    }

    if (conditions.length > 0) {
      query = query.where(and(...(conditions as any[]))) as any;
    }

    const orderMap: Record<string, any> = {
      newest: sql`${tasks.createdAt} DESC`,
      oldest: sql`${tasks.createdAt} ASC`,
      highest: sql`${tasks.budget} DESC`,
      lowest: sql`${tasks.budget} ASC`,
    };

    query = query.orderBy(orderMap[sort] ?? orderMap.newest) as any;

    const allTasks = await query;
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
        revisionCount: tasks.revisionCount,
        creatorId: tasks.creatorId,
        workerId: tasks.workerId,
        deadline: tasks.deadline,
        attachmentUrl: tasks.attachmentUrl,
        flagged: tasks.flagged,
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
    let workerName: string | null = null;
    if (task.workerId) {
      const worker = await db.query.users.findFirst({
        where: eq(users.id, task.workerId),
        columns: { clerkId: true, name: true },
      });
      workerClerkId = worker?.clerkId ?? null;
      workerName = worker?.name ?? null;
    }

    res.json({
      ...task,
      workerClerkId,
      workerName,
      submissionContent: submission?.content ?? null,
      submissionUrl: submission?.submissionUrl ?? null,
      submission: submission || null,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching task");
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

router.post("/tasks", requireAuth, async (req, res) => {
  try {
    const { title, description, budget, category, deadline, attachmentUrl } = req.body as {
      title?: string;
      description?: string;
      budget?: unknown;
      category?: unknown;
      deadline?: string;
      attachmentUrl?: string;
    };

    if (!title || !description || !budget) {
      res.status(400).json({ error: "title, description, and budget are required" });
      return;
    }

    const budgetNum = Number(budget);
    if (isNaN(budgetNum) || budgetNum < 100) {
      res.status(400).json({ error: "Minimum budget is ₹100" });
      return;
    }

    const categoryVal: Category = isValidCategory(category) ? category : "other";
    const currentUser = req.dbUser!;

    const poster = await db.query.users.findFirst({ where: eq(users.id, currentUser.id) });
    const ownerFree = isOwner(poster?.email);

    if (!ownerFree && (!poster?.name?.trim() || !poster?.bio?.trim())) {
      res.status(400).json({
        error: "Complete your profile (name + bio) before continuing",
        profileIncomplete: true,
      });
      return;
    }

    const available = poster?.balance ?? 0;
    if (!ownerFree && available < budgetNum) {
      const shortfall = budgetNum - available;
      res.status(402).json({
        error: `Insufficient wallet balance. You need ₹${shortfall} more to post this task. Please top up your wallet first.`,
        required: budgetNum,
        available,
      });
      return;
    }

    const deadlineDate = deadline ? new Date(deadline) : null;

    const [task] = await db.transaction(async (tx) => {
      if (!ownerFree) {
        await tx
          .update(users)
          .set({
            balance: sql`${users.balance} - ${budgetNum}`,
            pendingBalance: sql`${users.pendingBalance} + ${budgetNum}`,
          })
          .where(and(eq(users.id, currentUser.id), sql`${users.balance} >= ${budgetNum}`));
      }

      return tx
        .insert(tasks)
        .values({
          title,
          description,
          budget: budgetNum,
          category: categoryVal,
          creatorId: currentUser.id,
          deadline: deadlineDate,
          attachmentUrl: attachmentUrl?.trim() || null,
        })
        .returning();
    });

    res.status(201).json(task);
  } catch (err) {
    req.log.error({ err }, "Error creating task");
    res.status(500).json({ error: "Failed to create task" });
  }
});

// Old instant-accept route removed — replaced by application/invite system

router.post("/tasks/:id/submit", requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { content, submissionUrl } = req.body as { content?: string; submissionUrl?: string };
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
        .set({ content, submissionUrl: submissionUrl?.trim() || null, status: "pending" })
        .where(eq(submissions.taskId, id));
    } else {
      await db.insert(submissions).values({ taskId: id, content, submissionUrl: submissionUrl?.trim() || null });
    }

    const [updated] = await db
      .update(tasks)
      .set({ status: "submitted", revisionNote: null })
      .where(eq(tasks.id, id))
      .returning();

    // Notify creator
    await createNotification(
      task.creatorId,
      "work_submitted",
      `Work submitted for your task: "${task.title}" — review it now`,
      id,
    );

    // Email creator
    const creator = await db.query.users.findFirst({ where: eq(users.id, task.creatorId) });
    if (creator?.email) {
      emailWorkSubmitted(creator.email, task.title, id);
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error submitting task");
    res.status(500).json({ error: "Failed to submit task" });
  }
});

class ApproveError extends Error {
  constructor(
    public code: "INSUFFICIENT_BALANCE" | "NOT_SUBMITTED",
    public shortfall?: number,
    public available?: number,
  ) {
    super(code);
    this.name = "ApproveError";
  }
}

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

    const posterPre = await db.query.users.findFirst({ where: eq(users.id, currentUser.id) });
    const ownerFree = isOwner(posterPre?.email);

    if (!ownerFree && (!posterPre || (posterPre.pendingBalance ?? 0) < task.budget)) {
      res.status(402).json({
        error: `Escrow funds missing. The task budget of ₹${task.budget} must be in your wallet before approving.`,
        required: task.budget,
        available: posterPre?.pendingBalance ?? 0,
      });
      return;
    }

    const workerEarning = Math.floor(task.budget * 0.9);

    const approved = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(tasks)
        .set({ status: "completed" })
        .where(and(eq(tasks.id, id), eq(tasks.status, "submitted")))
        .returning();

      if (!updated) throw new ApproveError("NOT_SUBMITTED");

      if (!ownerFree) {
        const [poster] = await tx
          .select({ pendingBalance: users.pendingBalance })
          .from(users)
          .where(eq(users.id, currentUser.id));

        const available = poster?.pendingBalance ?? 0;
        if (available < task.budget) {
          throw new ApproveError("INSUFFICIENT_BALANCE", task.budget - available, available);
        }

        await tx
          .update(users)
          .set({ pendingBalance: sql`${users.pendingBalance} - ${task.budget}` })
          .where(eq(users.id, currentUser.id));
      }

      await tx
        .update(users)
        .set({
          balance: sql`${users.balance} + ${workerEarning}`,
          totalEarnings: sql`${users.totalEarnings} + ${workerEarning}`,
        })
        .where(eq(users.id, task.workerId!));

      const txValues: { userId: string; amount: number; type: string }[] = [
        { userId: task.workerId!, amount: workerEarning, type: "earning" },
      ];
      if (!ownerFree) {
        txValues.unshift({ userId: currentUser.id, amount: -task.budget, type: "payment" });
      }
      await tx.insert(transactions).values(txValues);

      await tx
        .update(submissions)
        .set({ status: "approved" })
        .where(eq(submissions.taskId, id));

      return updated;
    });

    // Notify worker
    await createNotification(
      task.workerId!,
      "task_approved",
      `Your work was approved for "${task.title}"! ₹${workerEarning} added to your wallet.`,
      id,
    );

    // Email worker
    const worker = await db.query.users.findFirst({ where: eq(users.id, task.workerId!) });
    if (worker?.email) {
      emailTaskApproved(worker.email, task.title, workerEarning, id);
    }

    // Fire referral rewards (non-blocking — failures don't affect approval)
    processReferralRewards(task.workerId!, id, task.budget).catch((err) => {
      req.log.error({ err }, "Referral rewards failed (non-critical)");
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

    if ((task.revisionCount ?? 0) === 0) {
      res.status(400).json({
        error: "You must request at least one revision before rejecting. This protects workers from unfair rejections.",
        code: "REVISION_REQUIRED",
      });
      return;
    }

    const rejectPoster = await db.query.users.findFirst({ where: eq(users.id, currentUser.id) });
    const rejectOwnerFree = isOwner(rejectPoster?.email);

    await db.transaction(async (tx) => {
      await tx.update(submissions).set({ status: "rejected" }).where(eq(submissions.taskId, id));
      await tx.update(tasks).set({ status: "open", workerId: null }).where(eq(tasks.id, id));
      if (!rejectOwnerFree) {
        await tx
          .update(users)
          .set({
            balance: sql`${users.balance} + ${task.budget}`,
            pendingBalance: sql`${users.pendingBalance} - ${task.budget}`,
          })
          .where(eq(users.id, currentUser.id));
        await tx.insert(transactions).values({ userId: currentUser.id, amount: task.budget, type: "refund" });
      }
    });

    const { reason } = req.body as { reason?: string };
    if (task.workerId) {
      const msg = reason?.trim()
        ? `Your submission for "${task.title}" was rejected. Reason: ${reason.trim()}`
        : `Your submission for "${task.title}" was rejected.`;
      await createNotification(task.workerId, "task_rejected", msg, id);
    }

    const [updated] = await db.select().from(tasks).where(eq(tasks.id, id));
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

    await db.update(submissions).set({ status: "rejected" }).where(eq(submissions.taskId, id));

    const [updated] = await db
      .update(tasks)
      .set({
        status: "revision_requested",
        revisionNote: note || null,
        revisionCount: sql`${tasks.revisionCount} + 1`,
      })
      .where(eq(tasks.id, id))
      .returning();

    if (task.workerId) {
      await createNotification(
        task.workerId,
        "revision_requested",
        `Revision requested for "${task.title}"${note ? `: ${note.slice(0, 80)}` : ""}`,
        id,
      );

      const worker = await db.query.users.findFirst({ where: eq(users.id, task.workerId) });
      if (worker?.email) {
        emailRevisionRequested(worker.email, task.title, note || null, id);
      }
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error requesting revision");
    res.status(500).json({ error: "Failed to request revision" });
  }
});

router.post("/tasks/:id/cancel", requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const currentUser = req.dbUser!;

    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (task.creatorId !== currentUser.id) {
      res.status(403).json({ error: "Only the creator can cancel" });
      return;
    }

    if (task.status !== "open") {
      res.status(400).json({
        error: "Only open (unassigned) tasks can be cancelled. A task in progress cannot be cancelled.",
      });
      return;
    }

    const cancelPoster = await db.query.users.findFirst({ where: eq(users.id, currentUser.id) });
    const cancelOwnerFree = isOwner(cancelPoster?.email);

    await db.transaction(async (tx) => {
      await tx.update(tasks).set({ status: "cancelled" }).where(eq(tasks.id, id));
      if (!cancelOwnerFree) {
        await tx
          .update(users)
          .set({
            balance: sql`${users.balance} + ${task.budget}`,
            pendingBalance: sql`${users.pendingBalance} - ${task.budget}`,
          })
          .where(eq(users.id, currentUser.id));
        await tx.insert(transactions).values({ userId: currentUser.id, amount: task.budget, type: "refund" });
      }
    });

    res.json({ success: true, refunded: cancelOwnerFree ? 0 : task.budget });
  } catch (err) {
    req.log.error({ err }, "Error cancelling task");
    res.status(500).json({ error: "Failed to cancel task" });
  }
});

export default router;
