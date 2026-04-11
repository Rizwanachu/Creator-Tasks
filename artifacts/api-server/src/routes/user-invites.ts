import { Router } from "express";
import { db, invites, tasks, users, applications } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { createNotification } from "../lib/notify";

const router = Router();

router.post("/tasks/:id/invite", requireAuth, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { workerClerkId } = req.body as { workerClerkId?: string };
    const currentUser = req.dbUser!;

    if (!workerClerkId) {
      res.status(400).json({ error: "Worker ID is required" });
      return;
    }

    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (task.creatorId !== currentUser.id) {
      res.status(403).json({ error: "Only the task creator can send invites" });
      return;
    }

    if (task.status !== "open") {
      res.status(400).json({ error: "Task is no longer open" });
      return;
    }

    const worker = await db.query.users.findFirst({ where: eq(users.clerkId, workerClerkId) });
    if (!worker) {
      res.status(404).json({ error: "Worker not found" });
      return;
    }

    if (worker.id === currentUser.id) {
      res.status(400).json({ error: "You cannot invite yourself" });
      return;
    }

    const existing = await db.query.invites.findFirst({
      where: and(eq(invites.taskId, taskId), eq(invites.workerId, worker.id)),
    });
    if (existing) {
      res.status(409).json({ error: "This worker has already been invited" });
      return;
    }

    const [invite] = await db
      .insert(invites)
      .values({
        taskId,
        workerId: worker.id,
        creatorId: currentUser.id,
      })
      .returning();

    await createNotification(
      worker.id,
      "task_invite",
      `${currentUser.name || "A creator"} invited you to work on: "${task.title}" (₹${task.budget})`,
      taskId,
    );

    res.status(201).json(invite);
  } catch (err) {
    req.log.error({ err }, "Error sending invite");
    res.status(500).json({ error: "Failed to send invite" });
  }
});

router.get("/tasks/:id/invites", requireAuth, async (req, res) => {
  try {
    const taskId = req.params.id;
    const currentUser = req.dbUser!;

    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
    if (!task || task.creatorId !== currentUser.id) {
      res.status(403).json({ error: "Only the task creator can view invites" });
      return;
    }

    const list = await db
      .select({
        id: invites.id,
        taskId: invites.taskId,
        workerId: invites.workerId,
        status: invites.status,
        createdAt: invites.createdAt,
        workerName: users.name,
        workerClerkId: users.clerkId,
      })
      .from(invites)
      .leftJoin(users, eq(invites.workerId, users.id))
      .where(eq(invites.taskId, taskId))
      .orderBy(sql`${invites.createdAt} DESC`);

    res.json(list);
  } catch (err) {
    req.log.error({ err }, "Error fetching invites");
    res.status(500).json({ error: "Failed to fetch invites" });
  }
});

router.get("/invites", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;

    const list = await db
      .select({
        id: invites.id,
        taskId: invites.taskId,
        status: invites.status,
        createdAt: invites.createdAt,
        taskTitle: tasks.title,
        taskBudget: tasks.budget,
        taskCategory: tasks.category,
        taskStatus: tasks.status,
        creatorName: users.name,
        creatorClerkId: users.clerkId,
      })
      .from(invites)
      .leftJoin(tasks, eq(invites.taskId, tasks.id))
      .leftJoin(users, eq(invites.creatorId, users.id))
      .where(eq(invites.workerId, currentUser.id))
      .orderBy(sql`${invites.createdAt} DESC`);

    res.json(list);
  } catch (err) {
    req.log.error({ err }, "Error fetching invites");
    res.status(500).json({ error: "Failed to fetch invites" });
  }
});

router.post("/invites/:id/accept", requireAuth, async (req, res) => {
  try {
    const inviteId = req.params.id;
    const currentUser = req.dbUser!;

    const invite = await db.query.invites.findFirst({ where: eq(invites.id, inviteId) });
    if (!invite) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }

    if (invite.workerId !== currentUser.id) {
      res.status(403).json({ error: "Only the invited worker can accept" });
      return;
    }

    if (invite.status !== "pending") {
      res.status(400).json({ error: "This invite is no longer pending" });
      return;
    }

    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, invite.taskId) });
    if (!task || task.status !== "open") {
      res.status(400).json({ error: "Task is no longer available" });
      return;
    }

    await db.transaction(async (tx) => {
      const updated = await tx
        .update(tasks)
        .set({ workerId: currentUser.id, status: "in_progress" })
        .where(and(eq(tasks.id, invite.taskId), eq(tasks.status, "open")))
        .returning();

      if (updated.length === 0) {
        throw new Error("CONFLICT");
      }

      await tx
        .update(invites)
        .set({ status: "accepted" })
        .where(and(eq(invites.id, inviteId), eq(invites.status, "pending")));

      await tx
        .update(invites)
        .set({ status: "declined" })
        .where(
          and(
            eq(invites.taskId, invite.taskId),
            sql`${invites.id} != ${inviteId}`,
            eq(invites.status, "pending"),
          ),
        );

      await tx
        .update(applications)
        .set({ status: "rejected" })
        .where(and(eq(applications.taskId, invite.taskId), eq(applications.status, "pending")));
    });

    await createNotification(
      invite.creatorId,
      "invite_accepted",
      `${currentUser.name || "A worker"} accepted your invite for "${task.title}"`,
      invite.taskId,
    );

    res.json({ success: true });
  } catch (err: any) {
    if (err?.message === "CONFLICT") {
      res.status(409).json({ error: "Task was already assigned to another worker" });
      return;
    }
    req.log.error({ err }, "Error accepting invite");
    res.status(500).json({ error: "Failed to accept invite" });
  }
});

router.post("/invites/:id/decline", requireAuth, async (req, res) => {
  try {
    const inviteId = req.params.id;
    const currentUser = req.dbUser!;

    const invite = await db.query.invites.findFirst({ where: eq(invites.id, inviteId) });
    if (!invite) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }

    if (invite.workerId !== currentUser.id) {
      res.status(403).json({ error: "Only the invited worker can decline" });
      return;
    }

    if (invite.status !== "pending") {
      res.status(400).json({ error: "This invite is no longer pending" });
      return;
    }

    await db.update(invites).set({ status: "declined" }).where(and(eq(invites.id, inviteId), eq(invites.status, "pending")));

    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, invite.taskId) });
    if (task) {
      await createNotification(
        invite.creatorId,
        "invite_declined",
        `${currentUser.name || "A worker"} declined your invite for "${task.title}"`,
        invite.taskId,
      );
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error declining invite");
    res.status(500).json({ error: "Failed to decline invite" });
  }
});

router.get("/users/search", requireAuth, async (req, res) => {
  try {
    const { q } = req.query as { q?: string };
    if (!q || q.trim().length < 2) {
      res.json([]);
      return;
    }

    const search = `%${q.trim()}%`;
    const results = await db
      .select({
        id: users.id,
        clerkId: users.clerkId,
        name: users.name,
        totalEarnings: users.totalEarnings,
      })
      .from(users)
      .where(sql`${users.name} ILIKE ${search}`)
      .limit(10);

    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Error searching users");
    res.status(500).json({ error: "Failed to search users" });
  }
});

export default router;
