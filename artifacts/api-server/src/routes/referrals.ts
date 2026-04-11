import { Router } from "express";
import { db, users, referrals, transactions } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { createNotification } from "../lib/notify";

const router = Router();

function generateCode(name: string): string {
  const base = (name || "user").replace(/\s+/g, "").slice(0, 6).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${suffix}`;
}

// GET /referral — get or create my referral code + stats
router.get("/referral", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;
    let user = await db.query.users.findFirst({ where: eq(users.id, currentUser.id) });

    if (!user?.referralCode) {
      let code = generateCode(user?.name ?? "");
      // Ensure uniqueness
      let attempts = 0;
      while (attempts < 10) {
        const existing = await db.query.users.findFirst({ where: eq(users.referralCode, code) });
        if (!existing) break;
        code = generateCode(user?.name ?? "") + Math.random().toString(36).slice(2, 4).toUpperCase();
        attempts++;
      }
      [user] = await db.update(users).set({ referralCode: code }).where(eq(users.id, currentUser.id)).returning();
    }

    const myReferrals = await db.select().from(referrals).where(eq(referrals.referrerId, currentUser.id));
    const totalCommission = myReferrals.reduce((sum, r) => sum + (r.commissionEarned ?? 0), 0);

    res.json({
      code: user?.referralCode,
      referralLink: `${process.env["FRONTEND_URL"] ?? "https://creatortasks.in"}?ref=${user?.referralCode}`,
      totalReferrals: myReferrals.length,
      totalCommissionEarned: totalCommission,
      referrals: myReferrals,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching referral info");
    res.status(500).json({ error: "Failed to fetch referral info" });
  }
});

// POST /referral/apply — apply a referral code (call once after signup)
router.post("/referral/apply", requireAuth, async (req, res) => {
  try {
    const { code } = req.body as { code?: string };
    const currentUser = req.dbUser!;

    if (!code) {
      res.status(400).json({ error: "Referral code is required" });
      return;
    }

    const referrer = await db.query.users.findFirst({ where: eq(users.referralCode, code.toUpperCase()) });
    if (!referrer) {
      res.status(404).json({ error: "Invalid referral code" });
      return;
    }
    if (referrer.id === currentUser.id) {
      res.status(400).json({ error: "Cannot use your own referral code" });
      return;
    }

    // Check if this user was already referred
    const alreadyReferred = await db.query.referrals.findFirst({
      where: eq(referrals.referredUserId, currentUser.id),
    });
    if (alreadyReferred) {
      res.status(409).json({ error: "Referral code already applied" });
      return;
    }

    // Credit ₹50 bonus to referrer (in rupees, stored as integer)
    const REFERRAL_BONUS = 50;

    await db.transaction(async (tx) => {
      await tx.insert(referrals).values({
        referrerId: referrer.id,
        referredUserId: currentUser.id,
        commissionEarned: REFERRAL_BONUS,
      });

      await tx.update(users).set({ balance: sql`${users.balance} + ${REFERRAL_BONUS}` }).where(eq(users.id, referrer.id));

      await tx.insert(transactions).values({ userId: referrer.id, amount: REFERRAL_BONUS, type: "referral" });
    });

    await createNotification(referrer.id, "referral_commission", `Someone joined using your referral code! ₹${REFERRAL_BONUS} added to your wallet.`);

    res.json({ success: true, message: `Referral applied. ₹${REFERRAL_BONUS} credited to referrer.` });
  } catch (err) {
    req.log.error({ err }, "Error applying referral");
    res.status(500).json({ error: "Failed to apply referral" });
  }
});

export default router;
