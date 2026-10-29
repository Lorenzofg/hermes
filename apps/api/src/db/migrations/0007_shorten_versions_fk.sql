-- The auto-generated FK name exceeded Postgres' 63-char identifier limit and
-- was silently truncated, polluting every migration run with a NOTICE.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'timesheet_analysis_versions_analysis_id_timesheet_analyses_id_f'
  ) THEN
    ALTER TABLE "timesheet_analysis_versions"
      RENAME CONSTRAINT "timesheet_analysis_versions_analysis_id_timesheet_analyses_id_f"
      TO "timesheet_analysis_versions_analysis_id_fk";
  END IF;
END $$;
