import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

// In production (Vercel serverless) we use a plain console-based logger so that
// there are zero worker threads, no SonicBoom file-descriptor ops, and no pino
// transport side-effects that can crash a cold-start function silently.
//
// In development we use pino-pretty for colourised, structured output.

function consoleLogger() {
  const fmt = (obj: object | null, msg: string) =>
    obj ? `${msg} ${JSON.stringify(obj)}` : msg;

  const base = {
    trace: (_obj: object | string, _msg?: string) => {},
    debug: (_obj: object | string, _msg?: string) => {},
    info: (obj: object | string, msg?: string) => {
      if (typeof obj === "string") console.log(obj);
      else console.log(fmt(obj, msg ?? ""));
    },
    warn: (obj: object | string, msg?: string) => {
      if (typeof obj === "string") console.warn(obj);
      else console.warn(fmt(obj, msg ?? ""));
    },
    error: (obj: object | string, msg?: string) => {
      if (typeof obj === "string") console.error(obj);
      else console.error(fmt(obj, msg ?? ""));
    },
    fatal: (obj: object | string, msg?: string) => {
      if (typeof obj === "string") console.error(obj);
      else console.error(fmt(obj, msg ?? ""));
    },
    child: () => base,
  };
  return base;
}

export const logger = isProduction
  ? consoleLogger()
  : pino({
      level: process.env.LOG_LEVEL ?? "info",
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers['set-cookie']",
      ],
      transport: {
        target: "pino-pretty",
        options: { colorize: true },
      },
    });
