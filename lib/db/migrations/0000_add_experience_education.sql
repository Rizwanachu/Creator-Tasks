-- Delta migration: add experience and education tables
-- Applies to: existing databases that have all other tables (users, tasks, etc.)
-- Tables created: experience, education
CREATE TABLE "experience" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"job_title" text NOT NULL,
	"company" text NOT NULL,
	"location" text,
	"start_date" text NOT NULL,
	"end_date" text,
	"is_current" boolean DEFAULT false,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "education" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"institution" text NOT NULL,
	"degree" text NOT NULL,
	"field_of_study" text,
	"start_year" integer NOT NULL,
	"end_year" integer,
	"is_current" boolean DEFAULT false,
	"grade" text,
	"activities" text,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
