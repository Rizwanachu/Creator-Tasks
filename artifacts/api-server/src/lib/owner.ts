import { db, users } from "@workspace/db";
import { sql } from "drizzle-orm";

const OWNER_EMAIL = (
  process.env.ADMIN_EMAIL ?? process.env.OWNER_EMAIL ?? "rizwanachoo123@gmail.com"
).toLowerCase();

export function isOwner(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === OWNER_EMAIL;
}

export async function findAdminUser() {
  return db.query.users.findFirst({
    where: sql`LOWER(${users.email}) = ${OWNER_EMAIL}`,
  });
}
