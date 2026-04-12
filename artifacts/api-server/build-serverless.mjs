/**
 * Builds src/app.ts into ../../api/index.mjs (project root) for the Vercel
 * serverless function. ESM format so Vercel's @vercel/node runtime runs it
 * without TypeScript recompilation — bypasses the node16 extension requirement.
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
  format: "esm",
  outfile: path.resolve(projectRoot, "api/index.mjs"),
  banner: {
    js: [
      "import { createRequire } from 'module';",
      "import { fileURLToPath } from 'url';",
      "import { dirname } from 'path';",
      "const require = createRequire(import.meta.url);",
      "const __filename = fileURLToPath(import.meta.url);",
      "const __dirname = dirname(__filename);",
    ].join("\n"),
  },
  logLevel: "info",
  external: ["*.node", "pg-native"],
});
