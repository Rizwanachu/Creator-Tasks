/**
 * Serverless entry point for Vercel.
 *
 * Wraps app initialisation in a try/catch so that ANY startup error is
 * returned as a readable JSON 500 rather than crashing the function silently.
 * This makes Vercel errors visible in the frontend error message.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

let handler: Handler;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const app = require("./app").default as Handler;
  handler = app;
} catch (err) {
  const message =
    err instanceof Error
      ? `${err.message}\n${err.stack ?? ""}`
      : String(err);

  handler = (_req, res) => {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Server init failed: ${message}` }));
  };
}

// CJS default export — Vercel's Nodejs launcher calls module.exports(req, res)
module.exports = handler;
