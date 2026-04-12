import { Router } from "express";
import { db, users, tasks, ratings } from "@workspace/db";
import { eq, and, avg, count, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /users/:clerkId — public profile
router.get("/users/:clerkId", async (req, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, req.params.clerkId),
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const completedTasks = await db
      .select({ id: tasks.id, title: tasks.title, budget: tasks.budget, category: tasks.category, createdAt: tasks.createdAt })
      .from(tasks)
      .where(and(eq(tasks.workerId, user.id), eq(tasks.status, "completed")));

    const postedCount = await db
      .select({ count: count(tasks.id) })
      .from(tasks)
      .where(eq(tasks.creatorId, user.id));

    const ratingStats = await db
      .select({ avg: avg(ratings.score), total: count(ratings.id) })
      .from(ratings)
      .where(eq(ratings.ratingFor, user.id));

    res.json({
      id: user.id,
      clerkId: user.clerkId,
      name: user.name,
      bio: user.bio,
      totalEarnings: user.totalEarnings ?? 0,
      referralCode: user.referralCode,
      completedTasksCount: completedTasks.length,
      postedTasksCount: postedCount[0]?.count ?? 0,
      rating: {
        average: ratingStats[0]?.avg ? parseFloat(String(ratingStats[0].avg)).toFixed(1) : null,
        total: ratingStats[0]?.total ?? 0,
      },
      recentWork: completedTasks.slice(0, 6),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching profile");
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// GET /leaderboard — top active creators (1+ completed tasks), sorted by earnings
router.get("/leaderboard", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: users.id,
        clerkId: users.clerkId,
        name: users.name,
        totalEarnings: users.totalEarnings,
        avgRating: avg(ratings.score),
        ratingCount: count(ratings.id),
        completedTasksCount: sql<number>`count(distinct case when ${tasks.status} = 'completed' then ${tasks.id} end)`,
        lastCompletedAt: sql<string | null>`max(case when ${tasks.status} = 'completed' then ${tasks.createdAt} end)`,
      })
      .from(users)
      .leftJoin(ratings, eq(ratings.ratingFor, users.id))
      .leftJoin(tasks, eq(tasks.workerId, users.id))
      .groupBy(users.id)
      .having(sql`count(distinct case when ${tasks.status} = 'completed' then ${tasks.id} end) >= 1`)
      .orderBy(sql`${users.totalEarnings} DESC NULLS LAST`)
      .limit(20);

    res.json(
      rows.map((w) => ({
        id: w.id,
        clerkId: w.clerkId,
        name: w.name,
        totalEarnings: w.totalEarnings ?? 0,
        completedTasksCount: Number(w.completedTasksCount),
        lastCompletedAt: w.lastCompletedAt ?? null,
        rating: {
          average: w.avgRating ? parseFloat(String(w.avgRating)).toFixed(1) : null,
          total: w.ratingCount,
        },
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error fetching leaderboard");
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// PUT /users/me — update own profile (bio, name)
router.put("/users/me", requireAuth, async (req, res) => {
  try {
    const { name, bio } = req.body as { name?: string; bio?: string };
    const currentUser = req.dbUser!;

    const [updated] = await db
      .update(users)
      .set({
        ...(name !== undefined && { name: name.trim().slice(0, 80) }),
        ...(bio !== undefined && { bio: bio.trim().slice(0, 500) }),
      })
      .where(eq(users.id, currentUser.id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error updating profile");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
