import { db, users, referrals, transactions } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { createNotification } from "./notify";

const REFERRAL_COMMISSION_PCT = 0.01;

export async function processReferralRewards(
  workerId: string,
  taskId: string,
  budget: number,
) {
  const referral = await db.query.referrals.findFirst({
    where: eq(referrals.referredUserId, workerId),
  });
  if (!referral) return;

  const commission = Math.floor(budget * REFERRAL_COMMISSION_PCT);
  if (commission <= 0) return;

  await db.transaction(async (tx) => {
    await tx
      .update(referrals)
      .set({
        completedTaskCount: sql`${referrals.completedTaskCount} + 1`,
        commissionEarned: sql`${referrals.commissionEarned} + ${commission}`,
      })
      .where(eq(referrals.id, referral.id));

    await tx
      .update(users)
      .set({ balance: sql`${users.balance} + ${commission}` })
      .where(eq(users.id, referral.referrerId));

    await tx.insert(transactions).values({
      userId: referral.referrerId,
      amount: commission,
      type: "referral_commission",
    });
  });

  await createNotification(
    referral.referrerId,
    "referral_commission",
    `Your referred creator completed a task — ₹${commission} commission added to your wallet!`,
    taskId,
  );
}
