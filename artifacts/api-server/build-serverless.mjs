/**
 * Builds src/serverless.ts into ../../api/index.js for the Vercel serverless
 * function. The entry file:
 *   - wraps app init in try/catch (any startup crash → readable JSON 500)
 *   - does module.exports = handler directly (no ESM interop wrapper needed)
 *
 * Key flags:
 *   define  – bakes NODE_ENV="production" so esbuild tree-shakes out every
 *             pino / pino-pretty / worker-thread code path at compile time.
 *   external – pg-native is an optional C++ addon; mark external so pg's
 *              try/catch loader handles absence gracefully at runtime.
 */
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(artifactDir, "../..");

await build({
  entryPoints: [path.resolve(artifactDir, "src/serverless.ts")],
  platform: "node",
  bundle: true,
  format: "cjs",
  outfile: path.resolve(projectRoot, "api/index.js"),
  logLevel: "info",
  // Bake NODE_ENV into the bundle so isProduction is always true at compile
  // time. Dead branches (pino, pino-http, pino-pretty, worker threads) are
  // eliminated by esbuild before they can cause runtime failures.
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  // sharp uses a native C++ binary — mark external so the lazy require() in
  // storage.ts falls into its catch block instead of crashing the bundle.
  external: ["*.node", "pg-native", "sharp"],
});
