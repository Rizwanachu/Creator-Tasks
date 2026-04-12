import { Router } from "express";
import { db, disputes, tasks, users } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { createNotification } from "../lib/notify";
import { isOwner } from "../lib/owner";

const router = Router();

const ADMIN_CLERK_ID = process.env["ADMIN_CLERK_ID"];

function isAdmin(user: { clerkId?: string; email?: string | null }) {
  if (ADMIN_CLERK_ID && user.clerkId === ADMIN_CLERK_ID) return true;
  return isOwner(user.email);
}

// POST /tasks/:id/dispute — flag/report a task
router.post("/tasks/:id/dispute", requireAuth, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { reason } = req.body as { reason?: string };
    const currentUser = req.dbUser!;

    if (!reason || reason.trim().length < 10) {
      res.status(400).json({ error: "Please provide a reason (at least 10 characters)" });
      return;
    }

    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const [dispute] = await db
      .insert(disputes)
      .values({ taskId, reportedBy: currentUser.id, reason: reason.trim() })
      .returning();

    // Flag the task
    await db.update(tasks).set({ flagged: true }).where(eq(tasks.id, taskId));

    // Notify admin if configured
    if (ADMIN_CLERK_ID) {
      const admin = await db.query.users.findFirst({ where: eq(users.clerkId, ADMIN_CLERK_ID) });
      if (admin) {
        await createNotification(admin.id, "dispute_opened", `New dispute filed for task: "${task.title}"`, taskId);
      }
    }

    res.status(201).json(dispute);
  } catch (err) {
    req.log.error({ err }, "Error creating dispute");
    res.status(500).json({ error: "Failed to create dispute" });
  }
});

// GET /disputes/mine — current user's own disputes
router.get("/disputes/mine", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;
    const list = await db
      .select({
        id: disputes.id,
        taskId: disputes.taskId,
        reason: disputes.reason,
        status: disputes.status,
        adminNote: disputes.adminNote,
        resolvedAt: disputes.resolvedAt,
        createdAt: disputes.createdAt,
        taskTitle: tasks.title,
      })
      .from(disputes)
      .leftJoin(tasks, eq(disputes.taskId, tasks.id))
      .where(eq(disputes.reportedBy, currentUser.id))
      .orderBy(sql`${disputes.createdAt} DESC`);
    res.json(list);
  } catch (err) {
    req.log.error({ err }, "Error fetching my disputes");
    res.status(500).json({ error: "Failed to fetch disputes" });
  }
});

// GET /admin/disputes — admin only: list all disputes
router.get("/admin/disputes", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;
    if (!isAdmin(currentUser)) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const list = await db
      .select({
        id: disputes.id,
        taskId: disputes.taskId,
        reason: disputes.reason,
        status: disputes.status,
        adminNote: disputes.adminNote,
        resolvedAt: disputes.resolvedAt,
        createdAt: disputes.createdAt,
        reportedByName: users.name,
        taskTitle: tasks.title,
      })
      .from(disputes)
      .leftJoin(users, eq(disputes.reportedBy, users.id))
      .leftJoin(tasks, eq(disputes.taskId, tasks.id))
      .orderBy(sql`${disputes.createdAt} DESC`);

    res.json(list);
  } catch (err) {
    req.log.error({ err }, "Error fetching disputes");
    res.status(500).json({ error: "Failed to fetch disputes" });
  }
});

// POST /admin/disputes/:id/resolve — admin only: resolve dispute
router.post("/admin/disputes/:id/resolve", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;
    if (!isAdmin(currentUser)) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const { adminNote, unflagTask } = req.body as { adminNote?: string; unflagTask?: boolean };

    const [dispute] = await db
      .update(disputes)
      .set({ status: "resolved", adminNote: adminNote ?? null, resolvedAt: new Date() })
      .where(eq(disputes.id, req.params.id))
      .returning();

    if (!dispute) {
      res.status(404).json({ error: "Dispute not found" });
      return;
    }

    if (unflagTask) {
      await db.update(tasks).set({ flagged: false }).where(eq(tasks.id, dispute.taskId));
    }

    // Notify the person who filed the dispute
    const d = await db.query.disputes.findFirst({ where: eq(disputes.id, req.params.id) });
    if (d) {
      await createNotification(d.reportedBy, "dispute_resolved", `Your dispute has been resolved by admin.`, d.taskId ?? undefined);
    }

    res.json(dispute);
  } catch (err) {
    req.log.error({ err }, "Error resolving dispute");
    res.status(500).json({ error: "Failed to resolve dispute" });
  }
});

// GET /admin/stats — admin commission dashboard
router.get("/admin/stats", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;
    if (!isAdmin(currentUser)) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const allUsers = await db.select({ id: users.id, name: users.name, email: users.email, balance: users.balance, totalEarnings: users.totalEarnings, createdAt: sql<string>`now()` }).from(users).limit(100);

    const totalCommission = await db
      .select({ total: sql<number>`coalesce(sum(budget * 0.1), 0)` })
      .from(tasks)
      .where(eq(tasks.status, "completed"));

    const completedCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(eq(tasks.status, "completed"));

    const openDisputes = await db
      .select({ count: sql<number>`count(*)` })
      .from(disputes)
      .where(eq(disputes.status, "open"));

    res.json({
      totalCommission: Math.floor(Number(totalCommission[0]?.total ?? 0)),
      completedTasks: Number(completedCount[0]?.count ?? 0),
      openDisputes: Number(openDisputes[0]?.count ?? 0),
      totalUsers: allUsers.length,
      users: allUsers,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching admin stats");
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

export default router;
