import { Router } from "express";
import { db, users, referrals, transactions } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { createNotification } from "../lib/notify";

const router = Router();

const COMMISSION_PCT = 0.01;

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
    const totalTasks = myReferrals.reduce((sum, r) => sum + (r.completedTaskCount ?? 0), 0);

    const myRecord = await db.query.referrals.findFirst({
      where: eq(referrals.referredUserId, currentUser.id),
    });

    res.json({
      code: user?.referralCode,
      referralLink: `${process.env["FRONTEND_URL"] ?? "https://creatortasks.vercel.app"}?ref=${user?.referralCode}`,
      totalReferrals: myReferrals.length,
      totalCommissionEarned: totalCommission,
      totalTasksCompleted: totalTasks,
      commissionPct: COMMISSION_PCT * 100,
      referrals: myReferrals.map(r => ({ ...r })),
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
        commissionEarned: 0,
      });

      await tx.update(users)
        .set({ referrerId: referrer.id })
        .where(eq(users.id, currentUser.id));
    });

    await createNotification(
      referrer.id,
      "referral_commission",
      `Someone joined using your referral code! You'll earn 1% commission on every task they complete.`,
    );

    res.json({ success: true, message: "Referral code applied. You'll both benefit as tasks get completed." });
  } catch (err) {
    req.log.error({ err }, "Error applying referral");
    res.status(500).json({ error: "Failed to apply referral" });
  }
});

export default router;
