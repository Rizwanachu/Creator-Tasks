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

    const normalizedTransactions = userTransactions.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      type: tx.type as "deposit" | "withdrawal" | "payment" | "fee",
      status: (tx.status ?? "completed") as "pending" | "completed" | "failed",
      description: tx.description ?? (tx.type === "payment" ? "Earnings received" : tx.type === "fee" ? "Platform fee" : "Transaction"),
      createdAt: tx.createdAt,
    }));

    res.json({
      balance: user?.balance ?? 0,
      pendingBalance: user?.pendingBalance ?? 0,
      transactions: normalizedTransactions,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching wallet");
    res.status(500).json({ error: "Failed to fetch wallet" });
  }
});

export default router;
