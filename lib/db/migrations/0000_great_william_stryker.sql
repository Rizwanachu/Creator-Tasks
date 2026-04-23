CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"worker_id" uuid NOT NULL,
	"message" text NOT NULL,
	"portfolio_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid,
	"participant_one_id" uuid NOT NULL,
	"participant_two_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"reported_by" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"admin_note" text,
	"resolved_at" timestamp,
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
--> statement-breakpoint
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
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"worker_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"task_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portfolio_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_clerk_id" text NOT NULL,
	"image_object_path" text NOT NULL,
	"caption" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"rating_by" uuid NOT NULL,
	"rating_for" uuid NOT NULL,
	"score" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" uuid NOT NULL,
	"referred_user_id" uuid NOT NULL,
	"commission_earned" integer DEFAULT 0,
	"completed_task_count" integer DEFAULT 0,
	"milestone_3_paid" boolean DEFAULT false,
	"milestone_5_paid" boolean DEFAULT false,
	"paid_out" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"content" text NOT NULL,
	"submission_url" text,
	"status" text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"budget" integer NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"status" text DEFAULT 'open',
	"revision_note" text,
	"revision_count" integer DEFAULT 0,
	"creator_id" uuid NOT NULL,
	"worker_id" uuid,
	"deadline" timestamp,
	"attachment_url" text,
	"flagged" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"payment_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "transactions_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text,
	"name" text,
	"username" text,
	"bio" text,
	"skills" text[],
	"portfolio_url" text,
	"instagram_handle" text,
	"youtube_handle" text,
	"upi_id" text,
	"avatar_object_path" text,
	"referral_code" text,
	"referrer_id" uuid,
	"total_earnings" integer DEFAULT 0,
	"balance" integer DEFAULT 0,
	"pending_balance" integer DEFAULT 0,
	"is_available" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"upi_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"razorpay_payout_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "ratings_rating_for_idx" ON "ratings" USING btree ("rating_for");--> statement-breakpoint
CREATE INDEX "tasks_worker_id_idx" ON "tasks" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "tasks_creator_id_idx" ON "tasks" USING btree ("creator_id");