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
  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? undefined
    : process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
