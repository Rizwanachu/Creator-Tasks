import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import { logger } from "./lib/logger";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";

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
app.use(cors());
app.use(cookieParser());

// Clerk Frontend API proxy (only active in production when CLERK_SECRET_KEY is set)
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// JSON body parser must run after the Clerk proxy (proxy needs the raw stream),
// but before the business routes that read req.body.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Clerk auth context (populates getAuth(req)) for everything below
app.use(clerkMiddleware());

app.use("/api", router);

export default app;
