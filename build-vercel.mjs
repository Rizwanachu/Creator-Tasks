/**
 * Vercel Build Output API script.
 * Creates .vercel/output/ directly so Vercel deploys our pre-built artifacts
 * without running ncc or @vercel/node over them.
 *
 * Structure:
 *   .vercel/output/config.json             — routing
 *   .vercel/output/static/                 — Vite frontend
 *   .vercel/output/functions/api/index.func/  — Express API bundle
 */
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, ".vercel/output");
const funcDir = path.join(outDir, "functions/api/index.func");
const staticDir = path.join(outDir, "static");

// ── 1. Clean slate ───────────────────────────────────────────────────────────
await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(funcDir, { recursive: true });
await fs.mkdir(staticDir, { recursive: true });

// ── 2. Build the API bundle (esbuild, CJS) ───────────────────────────────────
console.log("\n▶ Building API serverless bundle...");
execSync("pnpm --filter @workspace/api-server run build:serverless", {
  stdio: "inherit",
  cwd: root,
});
await fs.copyFile(path.join(root, "api/index.js"), path.join(funcDir, "index.js"));

// ── 3. Write the Vercel function config ──────────────────────────────────────
await fs.writeFile(
  path.join(funcDir, ".vc-config.json"),
  JSON.stringify({ runtime: "nodejs20.x", handler: "index.js", launcherType: "Nodejs" }, null, 2),
);

// ── 4. Build the Vite frontend ───────────────────────────────────────────────
console.log("\n▶ Building frontend...");
execSync("pnpm --filter @workspace/creatortasks run build", {
  stdio: "inherit",
  cwd: root,
});

// ── 5. Copy frontend dist → static ──────────────────────────────────────────
await copyDir(path.join(root, "dist"), staticDir);

// ── 6. Write routing config ──────────────────────────────────────────────────
await fs.writeFile(
  path.join(outDir, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "/api/(.*)", dest: "/api/index" },
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);

console.log("\n✓ .vercel/output built successfully");

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}
