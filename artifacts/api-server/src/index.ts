import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  const razorpayConfig = {
    keyId: !!process.env["RAZORPAY_KEY_ID"],
    keySecret: !!process.env["RAZORPAY_KEY_SECRET"],
    proPlanId: !!process.env["RAZORPAY_PRO_PLAN_ID"],
    webhookSecret: !!process.env["RAZORPAY_WEBHOOK_SECRET"],
  };
  const allConfigured = Object.values(razorpayConfig).every(Boolean);
  if (allConfigured) {
    logger.info({ razorpayConfig }, "Razorpay: all required env vars present — subscriptions enabled");
  } else {
    logger.warn({ razorpayConfig }, "Razorpay: one or more env vars missing — subscriptions may be degraded");
  }
});
