import type { RequestHandler } from "express";

const CLERK_FAPI = "https://frontend-api.clerk.dev";
export const CLERK_PROXY_PATH = "/api/__clerk";

// Lazy singleton — created on first matching request so module load is side-effect free.
let _proxy: RequestHandler | null = null;

export function clerkProxyMiddleware(): RequestHandler {
  if (process.env.NODE_ENV !== "production") {
    return (_req, _res, next) => next();
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return (_req, _res, next) => next();
  }

  return (req, res, next) => {
    if (!_proxy) {
      // Dynamic import so http-proxy-middleware is NOT evaluated at module load
      // time. Avoids startup-time side-effects (socket creation, etc.) that can
      // crash a cold-start serverless function.
      const { createProxyMiddleware } =
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("http-proxy-middleware") as typeof import("http-proxy-middleware");

      _proxy = createProxyMiddleware({
        target: CLERK_FAPI,
        changeOrigin: true,
        pathRewrite: (path: string) =>
          path.replace(new RegExp(`^${CLERK_PROXY_PATH}`), ""),
        on: {
          proxyReq: (proxyReq, innerReq) => {
            const protocol =
              innerReq.headers["x-forwarded-proto"] || "https";
            const host = innerReq.headers.host || "";
            const proxyUrl = `${protocol}://${host}${CLERK_PROXY_PATH}`;

            proxyReq.setHeader("Clerk-Proxy-Url", proxyUrl);
            proxyReq.setHeader("Clerk-Secret-Key", secretKey);

            const xff = innerReq.headers["x-forwarded-for"];
            const clientIp =
              (Array.isArray(xff) ? xff[0] : xff)?.split(",")[0]?.trim() ||
              innerReq.socket?.remoteAddress ||
              "";
            if (clientIp) {
              proxyReq.setHeader("X-Forwarded-For", clientIp);
            }
          },
        },
      }) as RequestHandler;
    }
    _proxy(req, res, next);
  };
}
