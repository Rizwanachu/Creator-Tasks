import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import webhookRouter from "./routes/webhook";
import { logger } from "./lib/logger";

const app: Express = express();

// Use process.env.NODE_ENV directly (not via a variable) so esbuild's define
// substitution ("production") turns this into `if (false)` and tree-shakes
// the entire pino-http block out of the serverless bundle.
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pinoHttp = (require("pino-http") as { default: typeof import("pino-http").default }).default ?? require("pino-http");
  app.use(
    (pinoHttp as typeof import("pino-http").default)({
      logger: logger as any,
      serializers: {
        req(req) {
          return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
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
app.use("/api/webhooks", express.raw({ type: "application/json", limit: "1mb" }), webhookRouter);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use(clerkMiddleware());

app.use("/api", router);

// Global error handler — 4 args required by Express.
// Returns JSON so apiFetch can parse the error message.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message =
    err instanceof Error && err.message
      ? err.message
      : typeof err === "string" && err
        ? err
        : "Internal server error";
  const status =
    (err as { status?: number; statusCode?: number })?.status ??
    (err as { status?: number; statusCode?: number })?.statusCode ??
    500;
  logger.error({ err }, "Unhandled error");
  res.status(status).json({ error: message });
});

export default app;
