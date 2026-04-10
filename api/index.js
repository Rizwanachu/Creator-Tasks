// Vercel serverless entry-point — plain JS so Vercel uses esbuild directly
// without running its internal TypeScript type-checker on our source files.
import app from "../artifacts/api-server/src/app.js";

export default app;
