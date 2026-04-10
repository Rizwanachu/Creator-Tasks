import { Router } from "express";
import { db, transactions, users } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/wallet", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;

    const user = await db.query.users.findFirst({
      where: eq(users.id, currentUser.id),
    });

    const userTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, currentUser.id))
      .orderBy(sql`${transactions.createdAt} DESC`);

    res.json({
      balance: user?.balance ?? 0,
      pendingBalance: user?.pendingBalance ?? 0,
      transactions: userTransactions,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching wallet");
    res.status(500).json({ error: "Failed to fetch wallet" });
  }
});

export default router;
