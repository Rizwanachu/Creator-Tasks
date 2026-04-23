import { Router } from "express";
import { db, users, tasks, ratings, portfolioItems } from "@workspace/db";
import { eq, and, avg, count, sql, ilike, or, isNotNull, ne, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

async function buildPublicProfile(user: typeof users.$inferSelect) {
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

  return {
    id: user.id,
    clerkId: user.clerkId,
    username: user.username ?? null,
    name: user.name,
    bio: user.bio,
    skills: user.skills ?? [],
    portfolioUrl: user.portfolioUrl,
    instagramHandle: user.instagramHandle,
    youtubeHandle: user.youtubeHandle,
    avatarUrl: user.avatarUrl,
    totalEarnings: user.totalEarnings ?? 0,
    isAvailable: user.isAvailable ?? true,
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
      userId: p.userId,
      url: p.url,
      caption: p.caption,
      createdAt: p.createdAt,
    })),
  };
}

// GET /users/me — return authenticated user's full private profile (including upiId)
// MUST be declared before GET /users/:clerkId to avoid :clerkId matching "me"
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
      username: user.username,
      name: user.name,
      bio: user.bio,
      skills: user.skills ?? [],
      portfolioUrl: user.portfolioUrl,
      instagramHandle: user.instagramHandle,
      youtubeHandle: user.youtubeHandle,
      upiId: user.upiId,
      avatarUrl: user.avatarUrl,
      isAvailable: user.isAvailable ?? true,
      portfolioItems: portfolio.map((p) => ({
        id: p.id,
        userId: p.userId,
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

// GET /users/check-username — check if a username is available
router.get("/users/check-username", async (req, res) => {
  const handle = (req.query.handle as string ?? "").trim().toLowerCase();
  const valid = /^[a-z0-9_]{3,20}$/.test(handle);
  if (!valid) {
    res.json({ available: false, reason: "Username must be 3-20 characters and contain only letters, numbers, or underscores." });
    return;
  }
  try {
    const existing = await db.query.users.findFirst({ where: sql`lower(${users.username}) = ${handle}` });
    res.json({ available: !existing });
  } catch (err) {
    req.log.error({ err }, "Error checking username");
    res.status(500).json({ error: "Failed to check username" });
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
      isAvailable,
      username,
    } = req.body as {
      name?: string;
      bio?: string;
      skills?: string[];
      portfolioUrl?: string;
      instagramHandle?: string;
      youtubeHandle?: string;
      upiId?: string;
      avatarUrl?: string;
      isAvailable?: boolean;
      username?: string;
    };
    const currentUser = req.dbUser!;

    const validationErrors: string[] = [];

    if (portfolioUrl !== undefined && portfolioUrl.trim()) {
      try {
        const parsed = new URL(portfolioUrl.trim());
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          validationErrors.push("portfolioUrl must use http or https");
        }
      } catch {
        validationErrors.push("portfolioUrl must be a valid URL");
      }
    }
    if (upiId !== undefined && upiId.trim() && !upiId.trim().includes("@")) {
      validationErrors.push("upiId must be a valid UPI ID (must contain @)");
    }
    if (
      avatarUrl !== undefined &&
      avatarUrl.trim() &&
      !avatarUrl.trim().startsWith("/objects/avatars/") &&
      !avatarUrl.trim().startsWith("data:image/")
    ) {
      validationErrors.push("avatarUrl must be a valid storage path (e.g. /objects/avatars/...) or a data URL");
    }
    if (validationErrors.length > 0) {
      res.status(400).json({ error: validationErrors.join("; ") });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim().slice(0, 80);
    if (bio !== undefined) updateData.bio = bio.trim().slice(0, 500);
    if (skills !== undefined) updateData.skills = Array.isArray(skills) ? skills.slice(0, 10).map((s) => s.trim().toLowerCase().slice(0, 40)) : [];
    if (portfolioUrl !== undefined) updateData.portfolioUrl = portfolioUrl.trim() || null;
    if (instagramHandle !== undefined) updateData.instagramHandle = instagramHandle.trim().replace(/^@/, "").slice(0, 60) || null;
    if (youtubeHandle !== undefined) updateData.youtubeHandle = youtubeHandle.trim().replace(/^@/, "").slice(0, 60) || null;
    if (upiId !== undefined) updateData.upiId = upiId.trim() || null;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl.trim() || null;
    if (isAvailable !== undefined) updateData.isAvailable = Boolean(isAvailable);
    if (username !== undefined && !currentUser.username) {
      const cleaned = username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(cleaned)) {
        res.status(400).json({ error: "Invalid username format. Use 3-20 characters: letters, numbers, or underscores." });
        return;
      }
      const taken = await db.query.users.findFirst({ where: sql`lower(${users.username}) = ${cleaned}` });
      if (taken) {
        res.status(409).json({ error: "That username is already taken. Please choose another." });
        return;
      }
      updateData.username = cleaned;
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, currentUser.id))
      .returning();

    res.json({
      id: updated.id,
      clerkId: updated.clerkId,
      username: updated.username,
      name: updated.name,
      bio: updated.bio,
      skills: updated.skills ?? [],
      portfolioUrl: updated.portfolioUrl,
      instagramHandle: updated.instagramHandle,
      youtubeHandle: updated.youtubeHandle,
      upiId: updated.upiId,
      avatarUrl: updated.avatarUrl,
      isAvailable: updated.isAvailable ?? true,
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

    const isStoragePath = url.startsWith("/objects/");
    const isExternalUrl = url.startsWith("http://") || url.startsWith("https://");
    const isDataUrl = url.startsWith("data:");
    if (!isStoragePath && !isExternalUrl && !isDataUrl) {
      res.status(400).json({ error: "Portfolio url must be a storage path, http(s) URL, or data URL" });
      return;
    }
    if (isExternalUrl) {
      try {
        new URL(url);
      } catch {
        res.status(400).json({ error: "Invalid portfolio item URL" });
        return;
      }
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

// GET /users/by-username/:username — public profile lookup by username
router.get("/users/by-username/:username", async (req, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.username, req.params.username.toLowerCase()),
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(await buildPublicProfile(user));
  } catch (err) {
    req.log.error({ err }, "Error fetching profile by username");
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// GET /users/:clerkId — public profile
// MUST be declared after all /users/me routes to avoid :clerkId matching "me"
router.get("/users/:clerkId", async (req, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, req.params.clerkId),
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(await buildPublicProfile(user));
  } catch (err) {
    req.log.error({ err }, "Error fetching profile");
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// GET /creators — browseable creator directory with search, skill filter, sort, and pagination
router.get("/creators", async (req, res) => {
  try {
    const rawSearch = (req.query.search as string | undefined)?.trim() ?? "";
    const usernameOnly = rawSearch.startsWith("@");
    const search = usernameOnly ? rawSearch.slice(1) : rawSearch;
    const skill = (req.query.skill as string | undefined)?.trim() ?? "";
    const sort = (req.query.sort as string | undefined) ?? "most_active";
    const available = req.query.available === "true";
    const page = Math.max(1, parseInt(req.query.page as string ?? "1", 10));
    const limit = Math.min(48, Math.max(1, parseInt(req.query.limit as string ?? "12", 10)));
    const offset = (page - 1) * limit;

    const conditions = [
      isNotNull(users.name),
      ne(sql`trim(coalesce(${users.name}, ''))`, ""),
    ];
    if (search) {
      conditions.push(
        usernameOnly
          ? ilike(users.username, `%${search}%`)!
          : or(
              ilike(users.name, `%${search}%`),
              ilike(users.username, `%${search}%`)
            )!
      );
    }
    if (skill) {
      conditions.push(sql`${users.skills} @> array[${skill}]::text[]`);
    }
    if (available) {
      conditions.push(eq(users.isAvailable, true));
    }

    const orderExpr =
      sort === "top_rated"
        ? sql`avg(${ratings.score}) DESC NULLS LAST`
        : sort === "newest"
        ? sql`${users.createdAt} DESC NULLS LAST`
        : sql`count(distinct case when ${tasks.status} = 'completed' then ${tasks.id} end) DESC`;

    const rows = await db
      .select({
        id: users.id,
        clerkId: users.clerkId,
        username: users.username,
        name: users.name,
        bio: users.bio,
        skills: users.skills,
        avatarUrl: users.avatarUrl,
        isAvailable: users.isAvailable,
        avgRating: avg(ratings.score),
        ratingCount: sql<number>`count(distinct ${ratings.id})`,
        completedTasksCount: sql<number>`count(distinct case when ${tasks.status} = 'completed' then ${tasks.id} end)`,
      })
      .from(users)
      .leftJoin(ratings, eq(ratings.ratingFor, users.id))
      .leftJoin(tasks, eq(tasks.workerId, users.id))
      .where(and(...conditions))
      .groupBy(users.id)
      .orderBy(orderExpr)
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);

    res.json({
      creators: items.map((u) => ({
        id: u.id,
        clerkId: u.clerkId,
        username: u.username ?? null,
        name: u.name,
        bio: u.bio,
        skills: u.skills ?? [],
        avatarUrl: u.avatarUrl,
        isAvailable: u.isAvailable ?? true,
        completedTasksCount: Number(u.completedTasksCount),
        rating: {
          average: u.avgRating ? parseFloat(String(u.avgRating)).toFixed(1) : null,
          total: Number(u.ratingCount),
        },
      })),
      hasMore,
      page,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching creators");
    res.status(500).json({ error: "Failed to fetch creators" });
  }
});

// GET /leaderboard — top active creators (1+ completed tasks), sorted by earnings
router.get("/leaderboard", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: users.id,
        clerkId: users.clerkId,
        username: users.username,
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
        username: w.username ?? null,
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

export default router;
