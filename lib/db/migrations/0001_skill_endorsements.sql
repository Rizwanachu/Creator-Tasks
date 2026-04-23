-- Add skill_endorsements table: tracks which users have endorsed which skills on creator profiles.
-- Each (endorsed_by_id, endorsed_user_id, skill) triple is unique to enforce one endorsement per user per skill.
-- Deployment note: this project uses `drizzle-kit push` (not migrate) for schema changes.
-- For existing databases: run `pnpm --filter @workspace/db push` to sync schema.
CREATE TABLE "skill_endorsements" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "endorsed_by_id" uuid NOT NULL,
        "endorsed_user_id" uuid NOT NULL,
        "skill" text NOT NULL,
        "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "skill_endorsements_unique_idx" ON "skill_endorsements" USING btree ("endorsed_by_id","endorsed_user_id","skill");
