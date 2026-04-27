import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      dbUser?: typeof users.$inferSelect;
    }
  }
}

// Throttle lastSeenAt writes — at most once per 30s per user.
const lastSeenWriteAt = new Map<string, number>();
const LAST_SEEN_THROTTLE_MS = 30_000;

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;

  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    let dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkUserId),
    });

    const sessionClaims = auth.sessionClaims as Record<string, unknown> | null;
    const clerkEmail = (sessionClaims?.email as string) || "";
    const clerkName = (sessionClaims?.name as string) || (sessionClaims?.full_name as string) || "";

    if (!dbUser) {
      // Insert with no username — the user picks one in onboarding.
      const [inserted] = await db
        .insert(users)
        .values({ clerkId: clerkUserId, email: clerkEmail, name: clerkName })
        .returning();
      dbUser = inserted;
    } else if (clerkEmail && dbUser.email !== clerkEmail) {
      // Keep email in sync with Clerk (important for owner privilege checks)
      const [updated] = await db
        .update(users)
        .set({ email: clerkEmail })
        .where(eq(users.clerkId, clerkUserId))
        .returning();
      dbUser = updated ?? dbUser;
    }

    req.dbUser = dbUser;

    // Throttled lastSeenAt heartbeat — fire-and-forget so it doesn't block the response.
    const now = Date.now();
    const last = lastSeenWriteAt.get(clerkUserId) ?? 0;
    if (now - last >= LAST_SEEN_THROTTLE_MS) {
      lastSeenWriteAt.set(clerkUserId, now);
      db.update(users)
        .set({ lastSeenAt: new Date(now) })
        .where(eq(users.clerkId, clerkUserId))
        .catch((err) => req.log.warn({ err }, "Failed to update lastSeenAt"));
    }

    next();
  } catch (err) {
    req.log.error({ err }, "Error in requireAuth middleware");
    res.status(500).json({ error: "Internal server error" });
  }
};
