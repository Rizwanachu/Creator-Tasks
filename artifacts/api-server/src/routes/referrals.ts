import { Router } from "express";
import { db, users, referrals, transactions } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { createNotification } from "../lib/notify";

const router = Router();

const SIGNUP_BONUS = 50;

function generateCode(name: string): string {
  const base = (name || "user").replace(/\s+/g, "").slice(0, 6).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${suffix}`;
}

async function ensureUniqueCode(name: string): Promise<string> {
  let code = generateCode(name);
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.query.users.findFirst({ where: eq(users.referralCode, code) });
    if (!existing) break;
    code = generateCode(name) + Math.random().toString(36).slice(2, 4).toUpperCase();
    attempts++;
  }
  return code;
}

router.get("/referral", requireAuth, async (req, res) => {
  try {
    const currentUser = req.dbUser!;
    let user = await db.query.users.findFirst({ where: eq(users.id, currentUser.id) });

    if (!user?.referralCode) {
      const code = await ensureUniqueCode(user?.name ?? "");
      [user] = await db.update(users).set({ referralCode: code }).where(eq(users.id, currentUser.id)).returning();
    }

    const myReferrals = await db.select().from(referrals).where(eq(referrals.referrerId, currentUser.id));

    const totalCommission = myReferrals.reduce((sum, r) => sum + (r.commissionEarned ?? 0), 0);
    const milestonesEarned = myReferrals.filter(r => r.milestone3Paid).length * 30 + myReferrals.filter(r => r.milestone5Paid).length * 50;

    const referralTxns = await db.select().from(transactions)
      .where(and(
        eq(transactions.userId, currentUser.id),
        eq(transactions.type, "referral_commission"),
      ));
    const lifetimeCommission = referralTxns.reduce((sum, t) => sum + t.amount, 0);

    const myRecord = await db.query.referrals.findFirst({
      where: eq(referrals.referredUserId, currentUser.id),
    });

    res.json({
      code: user?.referralCode,
      referralLink: `${process.env["FRONTEND_URL"] ?? "https://creatortasks.in"}?ref=${user?.referralCode}`,
      totalReferrals: myReferrals.length,
      totalCommissionEarned: totalCommission,
      lifetimeCommission,
      milestonesEarned,
      signupBonusPerFriend: SIGNUP_BONUS,
      referrals: myReferrals.map(r => ({
        ...r,
        nextMilestone: !r.milestone3Paid ? 3 : !r.milestone5Paid ? 5 : null,
      })),
      isReferred: !!myRecord,
      referredCompletedTasks: myRecord?.completedTaskCount ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching referral info");
    res.status(500).json({ error: "Failed to fetch referral info" });
  }
});

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

    const alreadyReferred = await db.query.referrals.findFirst({
      where: eq(referrals.referredUserId, currentUser.id),
    });
    if (alreadyReferred) {
      res.status(409).json({ error: "Referral code already applied" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.insert(referrals).values({
        referrerId: referrer.id,
        referredUserId: currentUser.id,
        commissionEarned: SIGNUP_BONUS,
      });

      await tx.update(users)
        .set({ referrerId: referrer.id, balance: sql`${users.balance} + ${SIGNUP_BONUS}` })
        .where(eq(users.id, currentUser.id));

      await tx.update(users)
        .set({ balance: sql`${users.balance} + ${SIGNUP_BONUS}` })
        .where(eq(users.id, referrer.id));

      await tx.insert(transactions).values([
        { userId: referrer.id, amount: SIGNUP_BONUS, type: "referral" },
        { userId: currentUser.id, amount: SIGNUP_BONUS, type: "referral" },
      ]);
    });

    await Promise.all([
      createNotification(
        referrer.id,
        "referral_commission",
        `Someone joined using your referral code! ₹${SIGNUP_BONUS} added to your wallet.`,
      ),
      createNotification(
        currentUser.id,
        "referral_bonus",
        `Referral code applied! ₹${SIGNUP_BONUS} welcome bonus added to your wallet.`,
      ),
    ]);

    res.json({ success: true, message: `Referral applied. ₹${SIGNUP_BONUS} credited to both wallets.` });
  } catch (err) {
    req.log.error({ err }, "Error applying referral");
    res.status(500).json({ error: "Failed to apply referral" });
  }
});

export default router;
