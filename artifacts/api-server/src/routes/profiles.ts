import { Router } from "express";
import { db, users, tasks, ratings, portfolioItems } from "@workspace/db";
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

    const portfolio = await db
      .select()
      .from(portfolioItems)
      .where(eq(portfolioItems.userId, user.clerkId))
      .orderBy(portfolioItems.createdAt);

    res.json({
      id: user.id,
      clerkId: user.clerkId,
      name: user.name,
      bio: user.bio,
      skills: user.skills ?? [],
      portfolioUrl: user.portfolioUrl,
      instagramHandle: user.instagramHandle,
      youtubeHandle: user.youtubeHandle,
      avatarUrl: user.avatarUrl,
      totalEarnings: user.totalEarnings ?? 0,
      referralCode: user.referralCode,
      completedTasksCount: completedTasks.length,
      postedTasksCount: postedCount[0]?.count ?? 0,
      rating: {
        average: ratingStats[0]?.avg ? parseFloat(String(ratingStats[0].avg)).toFixed(1) : null,
        total: ratingStats[0]?.total ?? 0,
      },
      recentWork: completedTasks.slice(0, 6),
      portfolioItems: portfolio.map((p) => ({
        id: p.id,
        url: p.url,
        caption: p.caption,
        createdAt: p.createdAt,
      })),
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
        avatarUrl: users.avatarUrl,
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
        avatarUrl: w.avatarUrl,
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

// GET /users/me — return authenticated user's full private profile (including upiId)
router.get("/users/me", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;
    const user = await db.query.users.findFirst({ where: eq(users.id, currentUser.id) });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const portfolio = await db.select().from(portfolioItems)
      .where(eq(portfolioItems.userId, user.clerkId))
      .orderBy(portfolioItems.createdAt);

    res.json({
      id: user.id,
      clerkId: user.clerkId,
      name: user.name,
      bio: user.bio,
      skills: user.skills ?? [],
      portfolioUrl: user.portfolioUrl,
      instagramHandle: user.instagramHandle,
      youtubeHandle: user.youtubeHandle,
      upiId: user.upiId,
      avatarUrl: user.avatarUrl,
      portfolioItems: portfolio.map((p) => ({
        id: p.id,
        url: p.url,
        caption: p.caption,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching own profile");
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PUT /users/me — update own profile
router.put("/users/me", requireAuth, async (req, res) => {
  try {
    const {
      name,
      bio,
      skills,
      portfolioUrl,
      instagramHandle,
      youtubeHandle,
      upiId,
      avatarUrl,
    } = req.body as {
      name?: string;
      bio?: string;
      skills?: string[];
      portfolioUrl?: string;
      instagramHandle?: string;
      youtubeHandle?: string;
      upiId?: string;
      avatarUrl?: string;
    };
    const currentUser = req.dbUser!;

    const validationErrors: string[] = [];

    if (portfolioUrl !== undefined && portfolioUrl.trim()) {
      try { new URL(portfolioUrl.trim()); } catch {
        validationErrors.push("portfolioUrl must be a valid URL");
      }
    }
    if (upiId !== undefined && upiId.trim() && !upiId.trim().includes("@")) {
      validationErrors.push("upiId must be a valid UPI ID (must contain @)");
    }
    if (validationErrors.length > 0) {
      res.status(400).json({ error: validationErrors.join("; ") });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim().slice(0, 80);
    if (bio !== undefined) updateData.bio = bio.trim().slice(0, 500);
    if (skills !== undefined) updateData.skills = Array.isArray(skills) ? skills.slice(0, 10).map((s) => s.trim().slice(0, 40)) : [];
    if (portfolioUrl !== undefined) updateData.portfolioUrl = portfolioUrl.trim() || null;
    if (instagramHandle !== undefined) updateData.instagramHandle = instagramHandle.trim().replace(/^@/, "").slice(0, 60) || null;
    if (youtubeHandle !== undefined) updateData.youtubeHandle = youtubeHandle.trim().replace(/^@/, "").slice(0, 60) || null;
    if (upiId !== undefined) updateData.upiId = upiId.trim() || null;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl.trim() || null;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, currentUser.id))
      .returning();

    res.json({
      id: updated.id,
      clerkId: updated.clerkId,
      name: updated.name,
      bio: updated.bio,
      skills: updated.skills ?? [],
      portfolioUrl: updated.portfolioUrl,
      instagramHandle: updated.instagramHandle,
      youtubeHandle: updated.youtubeHandle,
      upiId: updated.upiId,
      avatarUrl: updated.avatarUrl,
    });
  } catch (err) {
    req.log.error({ err }, "Error updating profile");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// POST /users/me/portfolio — add portfolio item
router.post("/users/me/portfolio", requireAuth, async (req, res) => {
  try {
    const { url, caption } = req.body as { url?: string; caption?: string };
    const currentUser = req.dbUser!;

    if (!url) {
      res.status(400).json({ error: "url is required" });
      return;
    }

    const existing = await db.select({ count: count(portfolioItems.id) })
      .from(portfolioItems)
      .where(eq(portfolioItems.userId, currentUser.clerkId));

    if ((existing[0]?.count ?? 0) >= 12) {
      res.status(400).json({ error: "Portfolio limit reached (max 12 items)" });
      return;
    }

    const [item] = await db.insert(portfolioItems).values({
      userId: currentUser.clerkId,
      url: url.trim(),
      caption: caption?.trim().slice(0, 200) || null,
    }).returning();

    res.json(item);
  } catch (err) {
    req.log.error({ err }, "Error adding portfolio item");
    res.status(500).json({ error: "Failed to add portfolio item" });
  }
});

// DELETE /users/me/portfolio/:id — remove portfolio item
router.delete("/users/me/portfolio/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.dbUser!;

    const item = await db.query.portfolioItems.findFirst({
      where: and(eq(portfolioItems.id, id), eq(portfolioItems.userId, currentUser.clerkId)),
    });

    if (!item) {
      res.status(404).json({ error: "Portfolio item not found" });
      return;
    }

    await db.delete(portfolioItems).where(eq(portfolioItems.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error deleting portfolio item");
    res.status(500).json({ error: "Failed to delete portfolio item" });
  }
});

// GET /users/me/portfolio — get own portfolio items
router.get("/users/me/portfolio", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;
    const items = await db.select()
      .from(portfolioItems)
      .where(eq(portfolioItems.userId, currentUser.clerkId))
      .orderBy(portfolioItems.createdAt);
    res.json(items);
  } catch (err) {
    req.log.error({ err }, "Error fetching portfolio");
    res.status(500).json({ error: "Failed to fetch portfolio" });
  }
});

export default router;
