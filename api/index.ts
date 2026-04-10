// Vercel serverless entry-point.
// Vercel compiles this TypeScript file with its own bundler (esbuild-based),
// resolving the workspace symlinks created by `pnpm install`.
// The Express app handles all routing internally; the vercel.json rewrite
// forwards every /api/* request here while preserving the original URL.
import app from "../artifacts/api-server/src/app";

export default app;
