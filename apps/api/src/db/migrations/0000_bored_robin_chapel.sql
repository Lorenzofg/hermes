DO $$ BEGIN
 CREATE TYPE "public"."provider" AS ENUM('claude', 'gpt');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "timesheet_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"provider" "provider" NOT NULL,
	"file_name" text NOT NULL,
	"total_days" integer NOT NULL,
	"csv_content" text NOT NULL,
	"warnings" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "timesheet_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"analysis_id" integer NOT NULL,
	"date" text NOT NULL,
	"clock_in_1" text DEFAULT '' NOT NULL,
	"clock_out_1" text DEFAULT '' NOT NULL,
	"clock_in_2" text DEFAULT '' NOT NULL,
	"clock_out_2" text DEFAULT '' NOT NULL,
	"clock_in_3" text DEFAULT '' NOT NULL,
	"clock_out_3" text DEFAULT '' NOT NULL,
	"clock_in_4" text DEFAULT '' NOT NULL,
	"clock_out_4" text DEFAULT '' NOT NULL,
	"clock_in_5" text DEFAULT '' NOT NULL,
	"clock_out_5" text DEFAULT '' NOT NULL,
	"clock_in_6" text DEFAULT '' NOT NULL,
	"clock_out_6" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "timesheet_records" ADD CONSTRAINT "timesheet_records_analysis_id_timesheet_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."timesheet_analyses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
