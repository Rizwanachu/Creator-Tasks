import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

function generateUsernameBase(name: string | null, clerkId: string): string {
  if (name && name.trim()) {
    const slug = slugify(name);
    if (slug.length >= 2) return slug;
  }
  return "creator-" + clerkId.replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase();
}

declare global {
  namespace Express {
    interface Request {
      dbUser?: typeof users.$inferSelect;
    }
  }
}

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
      const usernameBase = generateUsernameBase(clerkName, clerkUserId);
      let dbInserted: typeof users.$inferSelect | undefined;
      try {
        const [inserted] = await db
          .insert(users)
          .values({ clerkId: clerkUserId, email: clerkEmail, name: clerkName, username: usernameBase })
          .returning();
        dbInserted = inserted;
      } catch (insertErr: any) {
        if (insertErr?.code === "23505" && String(insertErr?.constraint ?? "").includes("username")) {
          const fallback = `${usernameBase}-${clerkUserId.replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase()}`;
          const [inserted] = await db
            .insert(users)
            .values({ clerkId: clerkUserId, email: clerkEmail, name: clerkName, username: fallback })
            .returning();
          dbInserted = inserted;
        } else {
          throw insertErr;
        }
      }
      dbUser = dbInserted!;
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
    next();
  } catch (err) {
    req.log.error({ err }, "Error in requireAuth middleware");
    res.status(500).json({ error: "Internal server error" });
  }
};
