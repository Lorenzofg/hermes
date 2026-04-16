DO $$ BEGIN
 CREATE TYPE "public"."provider" AS ENUM('claude', 'gpt');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payslip_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"provider" "provider" NOT NULL,
	"file_name" text NOT NULL,
	"warnings" text[] DEFAULT '{}' NOT NULL,
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payslip_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_id" integer NOT NULL,
	"kind" text NOT NULL,
	"description" text NOT NULL,
	"reference" text DEFAULT '' NOT NULL,
	"value" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payslip_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"analysis_id" integer NOT NULL,
	"competence" text DEFAULT '' NOT NULL,
	"employee_name" text DEFAULT '' NOT NULL,
	"cpf" text DEFAULT '' NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"admission_date" text DEFAULT '' NOT NULL,
	"base_salary" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_earnings" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_deductions" numeric(10, 2) DEFAULT '0' NOT NULL,
	"net_salary" numeric(10, 2) DEFAULT '0' NOT NULL,
	"fgts_base" numeric(10, 2) DEFAULT '0' NOT NULL,
	"fgts_amount" numeric(10, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "timesheet_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"provider" "provider" NOT NULL,
	"file_name" text NOT NULL,
	"total_days" integer NOT NULL,
	"csv_content" text NOT NULL,
	"warnings" text[] DEFAULT '{}' NOT NULL,
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL
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
 ALTER TABLE "payslip_items" ADD CONSTRAINT "payslip_items_record_id_payslip_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."payslip_records"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payslip_records" ADD CONSTRAINT "payslip_records_analysis_id_payslip_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."payslip_analyses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "timesheet_records" ADD CONSTRAINT "timesheet_records_analysis_id_timesheet_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."timesheet_analyses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
