import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import webhookRouter from "./routes/webhook";
import { logger } from "./lib/logger";

const isProduction = process.env.NODE_ENV === "production";

const app: Express = express();

// In production we use a plain console logger (no pino worker threads / SonicBoom).
// In development pino-http gives pretty structured request logs.
if (!isProduction) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pinoHttp = require("pino-http") as typeof import("pino-http");
  app.use(
    pinoHttp({
      logger: logger as any,
      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res) {
          return { statusCode: res.statusCode };
        },
      },
    }),
  );
}

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));

// Webhook must be registered with raw body BEFORE express.json() strips it.
// Razorpay sends application/json but we need the raw bytes to verify the HMAC.
// Scoped to /api/webhooks only so the JSON parser is unaffected for every other route.
app.use("/api/webhooks", express.raw({ type: "application/json", limit: "1mb" }), webhookRouter);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use(clerkMiddleware());

app.use("/api", router);

// Global error handler — must have 4 args for Express to recognise it as an error handler.
// Returns JSON so apiFetch can parse the error message correctly.
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  const status =
    (err as { status?: number; statusCode?: number })?.status ??
    (err as { status?: number; statusCode?: number })?.statusCode ??
    500;
  logger.error({ err }, "Unhandled error");
  res.status(status).json({ error: message });
});

export default app;
