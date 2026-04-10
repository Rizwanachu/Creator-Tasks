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

    if (!dbUser) {
      const sessionClaims = auth.sessionClaims as Record<string, unknown> | null;
      const email = (sessionClaims?.email as string) || "";
      const name = (sessionClaims?.name as string) || (sessionClaims?.full_name as string) || "";

      const [inserted] = await db
        .insert(users)
        .values({
          clerkId: clerkUserId,
          email,
          name,
        })
        .returning();
      dbUser = inserted;
    }

    req.dbUser = dbUser;
    next();
  } catch (err) {
    req.log.error({ err }, "Error in requireAuth middleware");
    res.status(500).json({ error: "Internal server error" });
  }
};
