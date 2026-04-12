import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import webhookRouter from "./routes/webhook";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

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
  const status = (err as { status?: number; statusCode?: number })?.status
    ?? (err as { status?: number; statusCode?: number })?.statusCode
    ?? 500;
  (req as any).log?.error({ err }, "Unhandled error");
  res.status(status).json({ error: message });
});

export default app;
