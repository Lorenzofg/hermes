-- Snapshots were being written as a JSON scalar (drizzle + postgres-js
-- double-encode jsonb on insert), which broke jsonb_array_length. Store the
-- days as text instead, and keep the count in its own column.
ALTER TABLE "timesheet_analysis_versions" ADD COLUMN IF NOT EXISTS "total_days" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "timesheet_analysis_versions"
SET "days" = (CASE WHEN jsonb_typeof("days") = 'string' THEN "days" #>> '{}' ELSE "days"::text END);
--> statement-breakpoint
ALTER TABLE "timesheet_analysis_versions" ALTER COLUMN "days" TYPE text USING "days"::text;
--> statement-breakpoint
UPDATE "timesheet_analysis_versions"
SET "total_days" = CASE WHEN left("days", 1) = '[' THEN jsonb_array_length("days"::jsonb) ELSE 0 END;
