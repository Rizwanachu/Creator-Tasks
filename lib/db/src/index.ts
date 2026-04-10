import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn(
    "[db] DATABASE_URL is not set — all database queries will fail at connection time.",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "",
  max: 1,
  // Neon (and most managed Postgres providers) require SSL in production.
  // rejectUnauthorized: false is needed in serverless environments where the
  // full certificate chain may not be available for verification.
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
