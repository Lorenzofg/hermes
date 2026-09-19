CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_settings" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"anthropic_api_key_enc" text,
	"anthropic_model" text,
	"openai_api_key_enc" text,
	"openai_model" text,
	"gemini_api_key_enc" text,
	"gemini_model" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "payslip_analyses" ADD COLUMN "user_id" integer;
--> statement-breakpoint
ALTER TABLE "timesheet_analyses" ADD COLUMN "user_id" integer;
--> statement-breakpoint
ALTER TABLE "batch_timesheet_analyses" ADD COLUMN "user_id" integer;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payslip_analyses" ADD CONSTRAINT "payslip_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "timesheet_analyses" ADD CONSTRAINT "timesheet_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "batch_timesheet_analyses" ADD CONSTRAINT "batch_timesheet_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
