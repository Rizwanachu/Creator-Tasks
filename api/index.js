// Plain JS entry — Vercel sends this straight to esbuild (no TS type-checking).
// esbuild resolves the .js extension to the .ts source file automatically.
import app from "../artifacts/api-server/src/app.js";

export default app;
