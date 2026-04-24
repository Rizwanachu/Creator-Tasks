/**
 * Razorpay setup verification script.
 *
 * Runs end-to-end checks:
 * 1. All required env vars are present
 * 2. Razorpay API keys are valid (test mode)
 * 3. Pro plan exists with correct amount (₹299/month = 29900 paise) and period
 * 4. Creates a real test subscription via the Razorpay Subscriptions API
 * 5. Sends a properly signed subscription.charged webhook to the local server
 *    and confirms it responds 200 ok
 *
 * Usage (requires the API server to be running on port 8080):
 *   npx tsx scripts/verify-razorpay-setup.ts
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — one or more checks failed
 */

import Razorpay from "razorpay";
import crypto from "crypto";

const PRO_PLAN_AMOUNT_PAISE = 29900;
const PRO_PLAN_PERIOD = "monthly";
const API_BASE = "http://localhost:8080";

function check(label: string, pass: boolean, detail?: string) {
  const icon = pass ? "✓" : "✗";
  const msg = detail ? `${label}: ${detail}` : label;
  console.log(`  ${icon} ${msg}`);
  return pass;
}

async function main() {
  console.log("\nRazorpay Setup Verification\n");
  const results: boolean[] = [];

  // 1. Env var presence
  console.log("1. Environment variables");
  const keyId = process.env["RAZORPAY_KEY_ID"] ?? "";
  const keySecret = process.env["RAZORPAY_KEY_SECRET"] ?? "";
  const planId = process.env["RAZORPAY_PRO_PLAN_ID"] ?? "";
  const webhookSecret = process.env["RAZORPAY_WEBHOOK_SECRET"] ?? "";

  results.push(check("RAZORPAY_KEY_ID", !!keyId));
  results.push(check("RAZORPAY_KEY_SECRET", !!keySecret));
  results.push(check("RAZORPAY_PRO_PLAN_ID", !!planId, planId || "(missing)"));
  results.push(check("RAZORPAY_WEBHOOK_SECRET", !!webhookSecret));

  if (!keyId || !keySecret || !planId || !webhookSecret) {
    console.log("\n✗ Missing required env vars — aborting.\n");
    process.exit(1);
  }

  const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

  // 2. Plan verification
  console.log("\n2. Razorpay plan");

  interface PlansAPI { fetch(id: string): Promise<Record<string, unknown>> }
  const plans = (rzp as unknown as { plans: PlansAPI }).plans;
  const plan = await plans.fetch(planId);
  const item = plan["item"] as Record<string, unknown> | undefined;

  results.push(check("Plan exists", !!plan["id"], String(plan["id"] ?? "")));
  results.push(check("Amount correct", item?.["amount"] === PRO_PLAN_AMOUNT_PAISE,
    `${item?.["amount"]} paise (expected ${PRO_PLAN_AMOUNT_PAISE})`));
  results.push(check("Currency INR", item?.["currency"] === "INR", String(item?.["currency"])));
  results.push(check("Period monthly", plan["period"] === PRO_PLAN_PERIOD, String(plan["period"])));
  results.push(check("Plan active", !!(item?.["active"])));

  // 3. Create a real test subscription
  console.log("\n3. Subscription creation (Razorpay test mode)");
  const sub = await rzp.subscriptions.create({
    plan_id: planId,
    total_count: 1,
    quantity: 1,
    notes: { userId: "verify-script", purpose: "e2e_verification" },
  } as Parameters<typeof rzp.subscriptions.create>[0]);
  results.push(check("Subscription created", !!sub.id, sub.id));
  results.push(check("Subscription status created", sub.status === "created", sub.status));

  // 4. Webhook endpoint — signed subscription.charged event
  console.log("\n4. Webhook endpoint (signed event)");
  const mockEvent = JSON.stringify({
    event: "subscription.charged",
    payload: {
      subscription: {
        entity: {
          id: sub.id,
          plan_id: planId,
          notes: { userId: "verify-script" },
          current_start: Math.floor(Date.now() / 1000),
          current_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        },
      },
    },
  });
  const sig = crypto.createHmac("sha256", webhookSecret).update(mockEvent).digest("hex");

  const resp = await fetch(`${API_BASE}/api/webhooks/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": sig },
    body: mockEvent,
  });
  const body = await resp.json() as { ok?: boolean };
  results.push(check("Webhook 200 ok", resp.status === 200 && body.ok === true,
    `status=${resp.status} ok=${body.ok}`));

  // Confirm bad signature is rejected
  const badResp = await fetch(`${API_BASE}/api/webhooks/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": "bad" },
    body: mockEvent,
  });
  results.push(check("Bad signature rejected", badResp.status === 400, `status=${badResp.status}`));

  // Summary
  const passed = results.filter(Boolean).length;
  const total = results.length;
  console.log(`\n${passed === total ? "✓" : "✗"} ${passed}/${total} checks passed\n`);
  if (passed !== total) process.exit(1);
}

main().catch((err) => {
  console.error("Verification failed:", err?.error ?? err);
  process.exit(1);
});
