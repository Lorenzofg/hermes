CREATE TABLE IF NOT EXISTS "timesheet_analysis_versions" (
  "id" serial PRIMARY KEY NOT NULL,
  "analysis_id" integer NOT NULL,
  "version" integer NOT NULL,
  "source" text NOT NULL,
  "days" jsonb NOT NULL,
  "warnings" text[] DEFAULT '{}' NOT NULL,
  "csv_content" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "timesheet_analysis_versions" ADD CONSTRAINT "timesheet_analysis_versions_analysis_id_timesheet_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "timesheet_analyses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "timesheet_analysis_versions_analysis_version_idx" ON "timesheet_analysis_versions" ("analysis_id","version");
--> statement-breakpoint
-- Backfill: every analysis that already exists becomes version 1 ("scan").
INSERT INTO "timesheet_analysis_versions" ("analysis_id", "version", "source", "days", "warnings", "csv_content")
SELECT a."id", 1, 'scan',
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'date', r."date",
      'shifts', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('clockIn', s.ci, 'clockOut', s.co))
        FROM (VALUES
          (r."clock_in_1", r."clock_out_1"),
          (r."clock_in_2", r."clock_out_2"),
          (r."clock_in_3", r."clock_out_3"),
          (r."clock_in_4", r."clock_out_4"),
          (r."clock_in_5", r."clock_out_5"),
          (r."clock_in_6", r."clock_out_6")
        ) AS s(ci, co)
        WHERE s.ci <> '' OR s.co <> ''
      ), '[]'::jsonb)
    ) ORDER BY to_date(r."date", 'DD/MM/YYYY'))
    FROM "timesheet_records" r
    WHERE r."analysis_id" = a."id"
  ), '[]'::jsonb),
  a."warnings",
  a."csv_content"
FROM "timesheet_analyses" a
ON CONFLICT DO NOTHING;
