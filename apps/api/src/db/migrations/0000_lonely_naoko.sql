DO $$ BEGIN
 CREATE TYPE "public"."provider" AS ENUM('claude', 'gpt');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analises" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"provider" "provider" NOT NULL,
	"nome_arquivo" text NOT NULL,
	"total_dias" integer NOT NULL,
	"csv_content" text NOT NULL,
	"avisos" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dias_ponto" (
	"id" serial PRIMARY KEY NOT NULL,
	"analise_id" integer NOT NULL,
	"data" text NOT NULL,
	"entrada1" text DEFAULT '' NOT NULL,
	"saida1" text DEFAULT '' NOT NULL,
	"entrada2" text DEFAULT '' NOT NULL,
	"saida2" text DEFAULT '' NOT NULL,
	"entrada3" text DEFAULT '' NOT NULL,
	"saida3" text DEFAULT '' NOT NULL,
	"entrada4" text DEFAULT '' NOT NULL,
	"saida4" text DEFAULT '' NOT NULL,
	"entrada5" text DEFAULT '' NOT NULL,
	"saida5" text DEFAULT '' NOT NULL,
	"entrada6" text DEFAULT '' NOT NULL,
	"saida6" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dias_ponto" ADD CONSTRAINT "dias_ponto_analise_id_analises_id_fk" FOREIGN KEY ("analise_id") REFERENCES "public"."analises"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
