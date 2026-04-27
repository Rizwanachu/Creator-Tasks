import { Router } from "express";
import { db, users, adminAuditLogs } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { recordAdminAction } from "../lib/audit";

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
