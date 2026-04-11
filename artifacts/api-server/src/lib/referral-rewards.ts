import { db, users, referrals, transactions } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { createNotification } from "./notify";

const REWARD_POOL_PCT = 0.2;
const LIFETIME_COMMISSION_PCT = 0.03;

const MILESTONE_3 = { referrer: 30, referred: 20 };
const MILESTONE_5 = { referrer: 50, referred: 30 };

const MIN_BUDGET = 300;

export async function processReferralRewards(
  workerId: string,
  taskId: string,
  budget: number,
) {
  if (budget < MIN_BUDGET) return;

  const referral = await db.query.referrals.findFirst({
    where: eq(referrals.referredUserId, workerId),
  });
  if (!referral) return;

  const platformFee = budget - Math.floor(budget * 0.9);
  const rewardPool = Math.floor(platformFee * REWARD_POOL_PCT);
  const workerShare = Math.floor(rewardPool * 0.5);
  const referrerPoolShare = Math.floor(rewardPool * 0.5);
  const lifetimeCommission = Math.floor(platformFee * LIFETIME_COMMISSION_PCT);
  const referrerTotal = referrerPoolShare + lifetimeCommission;

  if (workerShare + referrerTotal > platformFee) return;

  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(referrals)
      .set({
        completedTaskCount: sql`${referrals.completedTaskCount} + 1`,
        commissionEarned: sql`${referrals.commissionEarned} + ${referrerTotal}`,
      })
      .where(eq(referrals.id, referral.id))
      .returning();

    const newCount = updated.completedTaskCount ?? 0;

    if (workerShare > 0) {
      await tx.update(users)
        .set({ balance: sql`${users.balance} + ${workerShare}` })
        .where(eq(users.id, workerId));
      await tx.insert(transactions).values({
        userId: workerId,
        amount: workerShare,
        type: "referral_bonus",
      });
    }

    if (referrerTotal > 0) {
      await tx.update(users)
        .set({ balance: sql`${users.balance} + ${referrerTotal}` })
        .where(eq(users.id, referral.referrerId));
      if (referrerPoolShare > 0) {
        await tx.insert(transactions).values({
          userId: referral.referrerId,
          amount: referrerPoolShare,
          type: "referral_bonus",
        });
      }
      if (lifetimeCommission > 0) {
        await tx.insert(transactions).values({
          userId: referral.referrerId,
          amount: lifetimeCommission,
          type: "referral_commission",
        });
      }
    }

    if (newCount === 3 && !referral.milestone3Paid) {
      await tx.update(referrals).set({ milestone3Paid: true }).where(eq(referrals.id, referral.id));
      await tx.update(users)
        .set({ balance: sql`${users.balance} + ${MILESTONE_3.referrer}` })
        .where(eq(users.id, referral.referrerId));
      await tx.insert(transactions).values({
        userId: referral.referrerId,
        amount: MILESTONE_3.referrer,
        type: "referral_milestone",
      });
      await tx.update(users)
        .set({ balance: sql`${users.balance} + ${MILESTONE_3.referred}` })
        .where(eq(users.id, workerId));
      await tx.insert(transactions).values({
        userId: workerId,
        amount: MILESTONE_3.referred,
        type: "referral_milestone",
      });
    }

    if (newCount === 5 && !referral.milestone5Paid) {
      await tx.update(referrals).set({ milestone5Paid: true }).where(eq(referrals.id, referral.id));
      await tx.update(users)
        .set({ balance: sql`${users.balance} + ${MILESTONE_5.referrer}` })
        .where(eq(users.id, referral.referrerId));
      await tx.insert(transactions).values({
        userId: referral.referrerId,
        amount: MILESTONE_5.referrer,
        type: "referral_milestone",
      });
      await tx.update(users)
        .set({ balance: sql`${users.balance} + ${MILESTONE_5.referred}` })
        .where(eq(users.id, workerId));
      await tx.insert(transactions).values({
        userId: workerId,
        amount: MILESTONE_5.referred,
        type: "referral_milestone",
      });
    }
  });

  await createNotification(
    workerId,
    "referral_bonus",
    `You earned a referral reward for completing a task!`,
    taskId,
  );
  await createNotification(
    referral.referrerId,
    "referral_commission",
    `Your referred creator completed a task — commission added to your wallet!`,
    taskId,
  );
}
