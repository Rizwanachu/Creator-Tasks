import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

// In serverless (Vercel) production builds, pino is bundled by esbuild into a
// single app.mjs. Pino's async default destination spawns a worker thread that
// tries to require './lib/worker.js' relative to the bundle — a path that never
// exists post-bundle — crashing the function on every request.
//
// Fix: use pino.destination({ sync: true }) which writes directly to stdout fd
// without spawning any worker thread.
const dest = isProduction ? pino.destination({ dest: 1, sync: true }) : undefined;

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
    redact: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
    ],
    ...(isProduction
      ? {}
      : {
          transport: {
            target: "pino-pretty",
            options: { colorize: true },
          },
        }),
  },
  dest,
);
