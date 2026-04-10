/**
 * Builds src/app.ts into dist/app.mjs for the Vercel serverless function.
 * This is a plain-JS esbuild step — Vercel sees only the compiled output,
 * so its TypeScript checker never touches the source files.
 */
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [path.resolve(artifactDir, "src/app.ts")],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: path.resolve(artifactDir, "dist/app.mjs"),
  logLevel: "info",
  // Externalize native addons that can't be bundled.
  external: ["*.node", "pg-native"],
  // CJS-compatibility shim — express and some deps use require/module.exports internally.
  banner: {
    js: `import { createRequire as __crReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';
globalThis.require = __crReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);`,
  },
});
