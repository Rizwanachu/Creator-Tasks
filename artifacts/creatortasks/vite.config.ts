import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// import.meta.dirname is Node ≥21.2; fall back to URL-based approach for Node 20
const __dirname =
  import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async ({ command }) => {
  const isServe = command === "serve";

  // PORT is only needed for the dev/preview server, not during `vite build`
  let port = 5173;
  if (isServe) {
    const rawPort = process.env.PORT;
    if (!rawPort) {
      throw new Error(
        "PORT environment variable is required but was not provided.",
      );
    }
    port = Number(rawPort);
    if (Number.isNaN(port) || port <= 0) {
      throw new Error(`Invalid PORT value: "${rawPort}"`);
    }
  }

  // BASE_PATH is required in dev (Replit sets it), defaults to "/" for
  // production builds (Vercel, static hosting, etc.)
  let basePath = process.env.BASE_PATH ?? "/";
  if (isServe && !process.env.BASE_PATH) {
    throw new Error(
      "BASE_PATH environment variable is required but was not provided.",
    );
  }

  const replitPlugins =
    process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(__dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : [];

  return {
    base: basePath,
    plugins: [react(), tailwindcss(), runtimeErrorOverlay(), ...replitPlugins],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@assets": path.resolve(
          __dirname,
          "..",
          "..",
          "attached_assets",
        ),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(__dirname),
    build: {
      outDir: path.resolve(__dirname, "dist"),
      emptyOutDir: true,
    },
    server: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      proxy: {
        "/api": {
          target: "http://localhost:8080",
          changeOrigin: true,
        },
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
