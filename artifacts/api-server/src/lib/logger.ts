// Use process.env.NODE_ENV directly (not through a variable) so esbuild's
// define substitution makes `process.env.NODE_ENV !== "production"` a literal
// `false` that tree-shakes the entire pino import out of the serverless bundle.

type Logger = {
  trace(obj: object | string, msg?: string): void;
  debug(obj: object | string, msg?: string): void;
  info(obj: object | string, msg?: string): void;
  warn(obj: object | string, msg?: string): void;
  error(obj: object | string, msg?: string): void;
  fatal(obj: object | string, msg?: string): void;
  child(bindings: object): Logger;
};

function makeConsoleLogger(): Logger {
  const fmt = (obj: object, msg: string) =>
    msg ? `${msg} ${JSON.stringify(obj)}` : JSON.stringify(obj);

  const base: Logger = {
    trace: () => {},
    debug: () => {},
    info: (obj, msg?) =>
      typeof obj === "string" ? console.log(obj) : console.log(fmt(obj, msg ?? "")),
    warn: (obj, msg?) =>
      typeof obj === "string" ? console.warn(obj) : console.warn(fmt(obj, msg ?? "")),
    error: (obj, msg?) =>
      typeof obj === "string" ? console.error(obj) : console.error(fmt(obj, msg ?? "")),
    fatal: (obj, msg?) =>
      typeof obj === "string" ? console.error(obj) : console.error(fmt(obj, msg ?? "")),
    child: () => base,
  };
  return base;
}

// In production: plain console wrapper (no pino, no worker threads, no SonicBoom).
// In development: pino with pino-pretty.
// The process.env.NODE_ENV check is intentionally inline (not a variable) so
// esbuild's define makes it a compile-time constant and eliminates the pino branch.
export const logger: Logger =
  process.env.NODE_ENV !== "production"
    ? // eslint-disable-next-line @typescript-eslint/no-var-requires
      (require("pino") as typeof import("pino").default)({
        level: process.env.LOG_LEVEL ?? "info",
        redact: [
          "req.headers.authorization",
          "req.headers.cookie",
          "res.headers['set-cookie']",
        ],
        transport: { target: "pino-pretty", options: { colorize: true } },
      }) as unknown as Logger
    : makeConsoleLogger();
