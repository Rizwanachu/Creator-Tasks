/**
 * Builds src/app.ts into ../../api/index.js (project root) for the Vercel
 * serverless function. CJS format so Vercel's @vercel/node runtime picks it
 * up as a plain JS file without TypeScript recompilation.
 */
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(artifactDir, "../..");

await build({
  entryPoints: [path.resolve(artifactDir, "src/app.ts")],
  platform: "node",
  bundle: true,
  format: "cjs",
  outfile: path.resolve(projectRoot, "api/index.js"),
  logLevel: "info",
  external: ["*.node", "pg-native"],
});
