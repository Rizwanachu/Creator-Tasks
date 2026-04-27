import { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
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
    let clerkEmail = (sessionClaims?.email as string) || "";
    let clerkName = (sessionClaims?.name as string) || (sessionClaims?.full_name as string) || "";

    // Clerk's default JWT does NOT include email/name. If the session claims
    // don't have them, OR our DB row is still missing the email, fetch the
    // user record from Clerk so admin / owner checks work reliably.
    const needsClerkLookup = !clerkEmail || (dbUser && !dbUser.email);
    if (needsClerkLookup) {
      try {
        const clerkUser = await clerkClient.users.getUser(clerkUserId);
        if (!clerkEmail) {
          const primaryEmailId = clerkUser.primaryEmailAddressId;
          const primary = clerkUser.emailAddresses.find((e) => e.id === primaryEmailId);
          clerkEmail = primary?.emailAddress
            ?? clerkUser.emailAddresses[0]?.emailAddress
            ?? "";
        }
        if (!clerkName) {
          clerkName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim();
        }
      } catch (lookupErr) {
        req.log.warn({ err: lookupErr }, "Failed to fetch user from Clerk for email sync");
      }
    }

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

    if (dbUser?.bannedAt) {
      res.status(403).json({ error: "Your account has been banned." });
      return;
    }
    if (dbUser?.suspendedAt) {
      res.status(403).json({
        error: "Your account is suspended. Contact support if you believe this is a mistake.",
      });
      return;
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
