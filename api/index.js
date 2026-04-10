// Vercel serverless entry point.
// Imports from the pre-compiled JS bundle produced by build:serverless,
// so Vercel's TypeScript checker never touches the TypeScript source files.
import app from "../artifacts/api-server/dist/app.mjs";

export default app;
