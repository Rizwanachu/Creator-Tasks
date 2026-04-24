/**
 * One-time setup script: creates the CreatorTasks Pro monthly plan in Razorpay
 * and prints the plan ID that must be stored as RAZORPAY_PRO_PLAN_ID.
 *
 * Usage:
 *   RAZORPAY_KEY_ID=<id> RAZORPAY_KEY_SECRET=<secret> pnpm tsx scripts/create-razorpay-plan.ts
 *
 * The printed plan ID must then be set as an environment variable:
 *   RAZORPAY_PRO_PLAN_ID=<printed_plan_id>
 *
 * This script is idempotent in the sense that you can run it again
 * to create a new plan, but you should only call it once per environment.
 */

import Razorpay from "razorpay";

const keyId = process.env["RAZORPAY_KEY_ID"];
const keySecret = process.env["RAZORPAY_KEY_SECRET"];

if (!keyId || !keySecret) {
  console.error("❌  RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set.");
  process.exit(1);
}

interface RazorpayPlansAPI {
  create: (payload: Record<string, unknown>) => Promise<{ id: string; [key: string]: unknown }>;
}

const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

async function main() {
  const plans = (rzp as unknown as { plans: RazorpayPlansAPI }).plans;

  const plan = await plans.create({
    period: "monthly",
    interval: 1,
    item: {
      name: "CreatorTasks Pro",
      amount: 29900,
      currency: "INR",
      description: "Pro subscription — lower fees, unlimited posting, priority ranking",
    },
    notes: {
      env: process.env["NODE_ENV"] ?? "development",
    },
  });

  console.log("\n✅  Plan created successfully!\n");
  console.log(`   Plan ID : ${plan.id}\n`);
  console.log("Next step: set this as an environment variable:");
  console.log(`   RAZORPAY_PRO_PLAN_ID=${plan.id}\n`);
}

main().catch((err) => {
  console.error("❌  Failed to create plan:", err);
  process.exit(1);
});
