import { Router } from "express";
import { db, applications, tasks, users, invites, ratings } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { createNotification } from "../lib/notify";

const router = Router();

router.post("/tasks/:id/apply", requireAuth, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { message, portfolioUrl } = req.body as { message?: string; portfolioUrl?: string };
    const currentUser = req.dbUser!;

    if (!message || message.trim().length < 10) {
      res.status(400).json({ error: "Application message must be at least 10 characters" });
      return;
    }

    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (task.status !== "open") {
      res.status(400).json({ error: "This task is no longer accepting applications" });
      return;
    }

    if (task.creatorId === currentUser.id) {
      res.status(400).json({ error: "You cannot apply to your own task" });
      return;
    }

    const existing = await db.query.applications.findFirst({
      where: and(eq(applications.taskId, taskId), eq(applications.workerId, currentUser.id)),
    });
    if (existing) {
      res.status(409).json({ error: "You have already applied to this task" });
      return;
    }

    const [application] = await db
      .insert(applications)
      .values({
        taskId,
        workerId: currentUser.id,
        message: message.trim(),
        portfolioUrl: portfolioUrl?.trim() || null,
      })
      .returning();

    await createNotification(
      task.creatorId,
      "application_received",
      `${currentUser.name || "Someone"} applied to your task: "${task.title}"`,
      taskId,
    );

    res.status(201).json(application);
  } catch (err) {
    req.log.error({ err }, "Error applying to task");
    res.status(500).json({ error: "Failed to apply to task" });
  }
});

router.get("/tasks/:id/applications", requireAuth, async (req, res) => {
  try {
    const taskId = req.params.id;
    const currentUser = req.dbUser!;

    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (task.creatorId !== currentUser.id) {
      res.status(403).json({ error: "Only the task creator can view applications" });
      return;
    }

    const list = await db
      .select({
        id: applications.id,
        taskId: applications.taskId,
        workerId: applications.workerId,
        message: applications.message,
        portfolioUrl: applications.portfolioUrl,
        status: applications.status,
        createdAt: applications.createdAt,
        workerName: users.name,
        workerClerkId: users.clerkId,
        workerBio: users.bio,
        workerTotalEarnings: users.totalEarnings,
      })
      .from(applications)
      .leftJoin(users, eq(applications.workerId, users.id))
      .where(eq(applications.taskId, taskId))
      .orderBy(sql`${applications.createdAt} DESC`);

    const enriched = await Promise.all(
      list.map(async (app) => {
        const completedCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(tasks)
          .where(and(eq(tasks.workerId, app.workerId), eq(tasks.status, "completed")));

        const avgRating = await db
          .select({ avg: sql<string>`coalesce(round(avg(${ratings.score})::numeric, 1), 0)` })
          .from(ratings)
          .where(eq(ratings.ratingFor, app.workerId));

        return {
          ...app,
          workerCompletedTasks: Number(completedCount[0]?.count ?? 0),
          workerRating: parseFloat(avgRating[0]?.avg ?? "0"),
        };
      }),
    );

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Error fetching applications");
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

router.post("/applications/:id/accept", requireAuth, async (req, res) => {
  try {
    const applicationId = req.params.id;
    const currentUser = req.dbUser!;

    const application = await db.query.applications.findFirst({
      where: eq(applications.id, applicationId),
    });
    if (!application) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    if (application.status !== "pending") {
      res.status(400).json({ error: "Application is no longer pending" });
      return;
    }

    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, application.taskId) });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (task.creatorId !== currentUser.id) {
      res.status(403).json({ error: "Only the task creator can accept applications" });
      return;
    }

    if (task.status !== "open") {
      res.status(400).json({ error: "Task is no longer open for applications" });
      return;
    }

    await db.transaction(async (tx) => {
      const updated = await tx
        .update(tasks)
        .set({ workerId: application.workerId, status: "in_progress" })
        .where(and(eq(tasks.id, application.taskId), eq(tasks.status, "open")))
        .returning();

      if (updated.length === 0) {
        throw new Error("CONFLICT");
      }

      await tx
        .update(applications)
        .set({ status: "accepted" })
        .where(and(eq(applications.id, applicationId), eq(applications.status, "pending")));

      await tx
        .update(applications)
        .set({ status: "rejected" })
        .where(
          and(
            eq(applications.taskId, application.taskId),
            sql`${applications.id} != ${applicationId}`,
            eq(applications.status, "pending"),
          ),
        );

      await tx
        .update(invites)
        .set({ status: "declined" })
        .where(and(eq(invites.taskId, application.taskId), eq(invites.status, "pending")));
    });

    await createNotification(
      application.workerId,
      "application_accepted",
      `Your application for "${task.title}" was accepted! You can now start working.`,
      application.taskId,
    );

    res.json({ success: true });
  } catch (err: any) {
    if (err?.message === "CONFLICT") {
      res.status(409).json({ error: "Task was already assigned to another worker" });
      return;
    }
    req.log.error({ err }, "Error accepting application");
    res.status(500).json({ error: "Failed to accept application" });
  }
});

router.post("/applications/:id/reject", requireAuth, async (req, res) => {
  try {
    const applicationId = req.params.id;
    const currentUser = req.dbUser!;

    const application = await db.query.applications.findFirst({
      where: eq(applications.id, applicationId),
    });
    if (!application) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    if (application.status !== "pending") {
      res.status(400).json({ error: "Application is no longer pending" });
      return;
    }

    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, application.taskId) });
    if (!task || task.creatorId !== currentUser.id) {
      res.status(403).json({ error: "Only the task creator can reject applications" });
      return;
    }

    await db
      .update(applications)
      .set({ status: "rejected" })
      .where(and(eq(applications.id, applicationId), eq(applications.status, "pending")));

    await createNotification(
      application.workerId,
      "application_rejected",
      `Your application for "${task.title}" was not selected.`,
      application.taskId,
    );

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error rejecting application");
    res.status(500).json({ error: "Failed to reject application" });
  }
});

router.get("/tasks/:id/my-application", requireAuth, async (req, res) => {
  try {
    const taskId = req.params.id;
    const currentUser = req.dbUser!;

    const application = await db.query.applications.findFirst({
      where: and(eq(applications.taskId, taskId), eq(applications.workerId, currentUser.id)),
    });

    res.json(application ?? null);
  } catch (err) {
    req.log.error({ err }, "Error fetching application");
    res.status(500).json({ error: "Failed to fetch application" });
  }
});

export default router;
