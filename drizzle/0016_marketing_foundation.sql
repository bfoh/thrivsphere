-- Marketing hub, release 1: the Brand Kit, the photo and graphics library,
-- and a record of AI use.
--
-- brand_kit_versions / brand_kit_approvals: versions of how ThriveSphere looks
--   and sounds; the founder approves one exact version (fingerprint kept).
-- marketing_assets: photos and graphics in private storage, each with its
--   rights and alt text. No way to record a client in an image.
-- ai_usage: one row per AI request (feature, tokens, cost); no prompt text.
--
-- Only adds. No existing rows change.
CREATE TYPE "public"."ai_outcome" AS ENUM('ok', 'refused', 'error', 'blocked', 'over_budget');--> statement-breakpoint
CREATE TYPE "public"."asset_people" AS ENUM('none', 'staff_consented');--> statement-breakpoint
CREATE TYPE "public"."asset_rights" AS ENUM('owned', 'staff_photo_consented', 'licensed', 'generated');--> statement-breakpoint
CREATE TYPE "public"."asset_source" AS ENUM('upload', 'template', 'ai_generated');--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"actor_id" uuid,
	"entity" text,
	"entity_id" uuid,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cache_read_tokens" integer DEFAULT 0 NOT NULL,
	"cache_write_tokens" integer DEFAULT 0 NOT NULL,
	"images" integer DEFAULT 0 NOT NULL,
	"cost_micro_usd" integer DEFAULT 0 NOT NULL,
	"outcome" "ai_outcome" NOT NULL,
	"request_id" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_kit_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"content_hash" text NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_kit_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer NOT NULL,
	"content" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blob_path" text NOT NULL,
	"content_type" text NOT NULL,
	"width" integer,
	"height" integer,
	"bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"title" text NOT NULL,
	"alt_text" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"source" "asset_source" NOT NULL,
	"rights" "asset_rights" NOT NULL,
	"rights_note" text,
	"people" "asset_people" DEFAULT 'none' NOT NULL,
	"licence_expires" date,
	"template_key" text,
	"template_input" jsonb,
	"kit_version_id" uuid,
	"ai_provider" text,
	"ai_model" text,
	"ai_prompt" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_kit_approvals" ADD CONSTRAINT "brand_kit_approvals_version_id_brand_kit_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."brand_kit_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_kit_approvals" ADD CONSTRAINT "brand_kit_approvals_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_kit_versions" ADD CONSTRAINT "brand_kit_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_assets" ADD CONSTRAINT "marketing_assets_kit_version_id_brand_kit_versions_id_fk" FOREIGN KEY ("kit_version_id") REFERENCES "public"."brand_kit_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_assets" ADD CONSTRAINT "marketing_assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_created_idx" ON "ai_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_feature_idx" ON "ai_usage" USING btree ("feature","created_at");--> statement-breakpoint
CREATE INDEX "brand_kit_approvals_version_idx" ON "brand_kit_approvals" USING btree ("version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_kit_versions_number_idx" ON "brand_kit_versions" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_assets_blob_path_idx" ON "marketing_assets" USING btree ("blob_path");--> statement-breakpoint
CREATE INDEX "marketing_assets_created_idx" ON "marketing_assets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "marketing_assets_sha_idx" ON "marketing_assets" USING btree ("sha256");