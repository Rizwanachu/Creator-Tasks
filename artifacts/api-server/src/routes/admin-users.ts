import { Router } from "express";
import { db, users, adminAuditLogs, tasks, transactions } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { recordAdminAction } from "../lib/audit";
import { createNotification } from "../lib/notify";

const router = Router();

// POST /admin/users/:id/suspend — temporarily disable an account
router.post("/admin/users/:id/suspend", requireAuth, requireAdmin, async (req, res) => {
  try {
    const targetId = req.params.id as string;
    const { reason } = (req.body ?? {}) as { reason?: string };
    const admin = req.dbUser!;

    const target = await db.query.users.findFirst({ where: eq(users.id, targetId) });
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (target.id === admin.id) {
      res.status(400).json({ error: "You cannot suspend your own account" });
      return;
    }
    if (target.bannedAt) {
      res.status(400).json({ error: "User is already banned" });
      return;
    }

    const [updated] = await db
      .update(users)
      .set({
        suspendedAt: new Date(),
        moderationReason: reason?.trim() || null,
      })
      .where(eq(users.id, targetId))
      .returning();

    await recordAdminAction({
      adminUserId: admin.id,
      adminEmail: admin.email,
      action: "user.suspend",
      targetUserId: targetId,
      targetType: "user",
      targetId: targetId,
      reason: reason?.trim() || null,
    });

    res.json({ ok: true, user: updated });
  } catch (err) {
    req.log.error({ err }, "Error suspending user");
    res.status(500).json({ error: "Failed to suspend user" });
  }
});

// POST /admin/users/:id/unsuspend — lift a suspension
router.post("/admin/users/:id/unsuspend", requireAuth, requireAdmin, async (req, res) => {
  try {
    const targetId = req.params.id as string;
    const admin = req.dbUser!;

    const target = await db.query.users.findFirst({ where: eq(users.id, targetId) });
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [updated] = await db
      .update(users)
      .set({ suspendedAt: null, moderationReason: null })
      .where(eq(users.id, targetId))
      .returning();

    await recordAdminAction({
      adminUserId: admin.id,
      adminEmail: admin.email,
      action: "user.unsuspend",
      targetUserId: targetId,
      targetType: "user",
      targetId: targetId,
    });

    res.json({ ok: true, user: updated });
  } catch (err) {
    req.log.error({ err }, "Error unsuspending user");
    res.status(500).json({ error: "Failed to unsuspend user" });
  }
});

// POST /admin/users/:id/ban — permanently disable an account
router.post("/admin/users/:id/ban", requireAuth, requireAdmin, async (req, res) => {
  try {
    const targetId = req.params.id as string;
    const { reason } = (req.body ?? {}) as { reason?: string };
    const admin = req.dbUser!;

    const target = await db.query.users.findFirst({ where: eq(users.id, targetId) });
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (target.id === admin.id) {
      res.status(400).json({ error: "You cannot ban your own account" });
      return;
    }

    const [updated] = await db
      .update(users)
      .set({
        bannedAt: new Date(),
        suspendedAt: new Date(),
        moderationReason: reason?.trim() || null,
      })
      .where(eq(users.id, targetId))
      .returning();

    await recordAdminAction({
      adminUserId: admin.id,
      adminEmail: admin.email,
      action: "user.ban",
      targetUserId: targetId,
      targetType: "user",
      targetId: targetId,
      reason: reason?.trim() || null,
    });

    res.json({ ok: true, user: updated });
  } catch (err) {
    req.log.error({ err }, "Error banning user");
    res.status(500).json({ error: "Failed to ban user" });
  }
});

// POST /admin/users/:id/unban — lift a ban
router.post("/admin/users/:id/unban", requireAuth, requireAdmin, async (req, res) => {
  try {
    const targetId = req.params.id as string;
    const admin = req.dbUser!;

    const target = await db.query.users.findFirst({ where: eq(users.id, targetId) });
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [updated] = await db
      .update(users)
      .set({ bannedAt: null, suspendedAt: null, moderationReason: null })
      .where(eq(users.id, targetId))
      .returning();

    await recordAdminAction({
      adminUserId: admin.id,
      adminEmail: admin.email,
      action: "user.unban",
      targetUserId: targetId,
      targetType: "user",
      targetId: targetId,
    });

    res.json({ ok: true, user: updated });
  } catch (err) {
    req.log.error({ err }, "Error unbanning user");
    res.status(500).json({ error: "Failed to unban user" });
  }
});

// GET /admin/tasks — recent tasks for moderation review
router.get("/admin/tasks", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { filter } = req.query as { filter?: string };

    let whereClause: any = undefined;
    if (filter === "rejected") {
      whereClause = sql`${tasks.rejectedAt} IS NOT NULL`;
    } else if (filter === "active") {
      // Tasks a creator has accepted (ticked) and is currently working on —
      // assigned to a worker but not yet completed or rejected.
      whereClause = sql`${tasks.rejectedAt} IS NULL AND ${tasks.status} IN ('in_progress', 'submitted', 'revision_requested')`;
    } else if (filter === "new") {
      // Tasks awaiting a worker — freshly posted, not yet picked up
      whereClause = sql`${tasks.rejectedAt} IS NULL AND ${tasks.status} = 'open'`;
    } else if (filter === "completed") {
      // Tasks completed by a creator AND the creator got paid (wallet credit
      // happens atomically with status -> 'completed' in the approve handler).
      whereClause = sql`${tasks.status} = 'completed' AND ${tasks.workerId} IS NOT NULL`;
    }

    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        budget: tasks.budget,
        category: tasks.category,
        status: tasks.status,
        flagged: tasks.flagged,
        rejectedAt: tasks.rejectedAt,
        rejectionReason: tasks.rejectionReason,
        createdAt: tasks.createdAt,
        creatorId: tasks.creatorId,
        creatorName: users.name,
        creatorEmail: users.email,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.creatorId, users.id))
      .where(whereClause as any)
      .orderBy(desc(tasks.createdAt))
      .limit(100);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Error fetching admin tasks");
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// POST /admin/tasks/:id/reject — hide a task from the marketplace
router.post("/admin/tasks/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  try {
    const taskId = req.params.id as string;
    const { reason } = (req.body ?? {}) as { reason?: string };
    const admin = req.dbUser!;

    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    if (task.rejectedAt) {
      res.status(400).json({ error: "Task is already rejected" });
      return;
    }

    const trimmedReason = reason?.trim() || null;

    const [updated] = await db
      .update(tasks)
      .set({ rejectedAt: new Date(), rejectionReason: trimmedReason })
      .where(eq(tasks.id, taskId))
      .returning();

    await recordAdminAction({
      adminUserId: admin.id,
      adminEmail: admin.email,
      action: "task.reject",
      targetUserId: task.creatorId,
      targetType: "task",
      targetId: taskId,
      reason: trimmedReason,
      metadata: { title: task.title },
    });

    if (task.creatorId) {
      const message = trimmedReason
        ? `Your task "${task.title}" was removed by an admin. Reason: ${trimmedReason}`
        : `Your task "${task.title}" was removed by an admin.`;
      await createNotification(task.creatorId, "task_rejected", message, taskId);
    }

    res.json({ ok: true, task: updated });
  } catch (err) {
    req.log.error({ err }, "Error rejecting task");
    res.status(500).json({ error: "Failed to reject task" });
  }
});

// POST /admin/tasks/:id/unreject — restore a previously rejected task
router.post("/admin/tasks/:id/unreject", requireAuth, requireAdmin, async (req, res) => {
  try {
    const taskId = req.params.id as string;
    const admin = req.dbUser!;

    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const [updated] = await db
      .update(tasks)
      .set({ rejectedAt: null, rejectionReason: null })
      .where(eq(tasks.id, taskId))
      .returning();

    await recordAdminAction({
      adminUserId: admin.id,
      adminEmail: admin.email,
      action: "task.unreject",
      targetUserId: task.creatorId,
      targetType: "task",
      targetId: taskId,
      metadata: { title: task.title },
    });

    res.json({ ok: true, task: updated });
  } catch (err) {
    req.log.error({ err }, "Error unrejecting task");
    res.status(500).json({ error: "Failed to unreject task" });
  }
});

// GET /admin/transactions — full transaction log (last 200)
router.get("/admin/transactions", requireAuth, requireAdmin, async (req, res) => {
  try {
    const rows = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        amount: transactions.amount,
        type: transactions.type,
        paymentId: transactions.paymentId,
        createdAt: transactions.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .orderBy(desc(transactions.createdAt))
      .limit(200);

    // Aggregate totals so admins can see GMV / commission / payouts at a glance.
    const totals = await db
      .select({
        type: transactions.type,
        total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(transactions)
      .groupBy(transactions.type);

    res.json({ rows, totals });
  } catch (err) {
    req.log.error({ err }, "Error fetching admin transactions");
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// GET /admin/audit-logs — recent admin actions (last 100)
router.get("/admin/audit-logs", requireAuth, requireAdmin, async (req, res) => {
  try {
    const logs = await db
      .select({
        id: adminAuditLogs.id,
        adminEmail: adminAuditLogs.adminEmail,
        action: adminAuditLogs.action,
        targetUserId: adminAuditLogs.targetUserId,
        targetType: adminAuditLogs.targetType,
        targetId: adminAuditLogs.targetId,
        reason: adminAuditLogs.reason,
        createdAt: adminAuditLogs.createdAt,
        targetName: sql<string>`(SELECT name FROM users WHERE id = ${adminAuditLogs.targetUserId})`,
        targetEmail: sql<string>`(SELECT email FROM users WHERE id = ${adminAuditLogs.targetUserId})`,
      })
      .from(adminAuditLogs)
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(100);

    res.json(logs);
  } catch (err) {
    req.log.error({ err }, "Error fetching audit logs");
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

export default router;
