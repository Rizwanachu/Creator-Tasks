/**
 * Builds src/app.ts into ../../api/index.js (project root) for the Vercel
 * serverless function. CJS format so Vercel's runtime picks it up without any
 * TypeScript recompilation.
 *
 * The footer ensures `module.exports = app` directly (not `module.exports.default = app`)
 * so Vercel's Nodejs launcher finds the Express handler regardless of how it
 * resolves the CJS default export.
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
  // pg-native is an optional C++ addon — mark external so require() fails
  // gracefully at runtime and pg falls back to the pure-JS implementation.
  // *.node catches any other native addons.
  external: ["*.node", "pg-native"],
  // Ensures module.exports IS the Express app, not { default: app }.
  // Vercel's Nodejs launcher calls module.exports(req, res) directly.
  footer: {
    js: "module.exports = module.exports.default ?? module.exports;",
  },
});
