ALTER TYPE "provider" ADD VALUE 'openrouter';
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "openrouter_api_key_enc" text;
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "openrouter_model" text;
