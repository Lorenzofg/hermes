CREATE TABLE IF NOT EXISTS "batch_timesheet_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"provider" "provider" NOT NULL,
	"file_name" text NOT NULL,
	"total_people" integer NOT NULL,
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_timesheet_people" (
	"id" serial PRIMARY KEY NOT NULL,
	"analysis_id" integer NOT NULL,
	"person_name" text NOT NULL,
	"total_days" integer NOT NULL,
	"csv_content" text NOT NULL,
	"warnings" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_timesheet_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
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
 ALTER TABLE "batch_timesheet_people" ADD CONSTRAINT "batch_timesheet_people_analysis_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."batch_timesheet_analyses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "batch_timesheet_records" ADD CONSTRAINT "batch_timesheet_records_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."batch_timesheet_people"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
