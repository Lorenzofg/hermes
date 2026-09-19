ALTER TABLE "payslip_analyses" ADD COLUMN "page_log" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "timesheet_analyses" ADD COLUMN "page_log" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "batch_timesheet_analyses" ADD COLUMN "page_log" jsonb DEFAULT '[]'::jsonb NOT NULL;
