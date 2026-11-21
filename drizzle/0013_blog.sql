-- The blog: posts, their versions, and each review decision.
--
-- What readers see lives in append-only versions. A post points at the version
-- being worked on, the one a reviewer approved and the one on the website, so
-- a live post keeps showing what was approved while a new version is reviewed.
-- `users.blog_reviewer` marks colleagues the founder has named as reviewers.
--
-- Only adds. No existing rows change.
CREATE TYPE "public"."blog_review_decision" AS ENUM('approved', 'changes_requested');--> statement-breakpoint
CREATE TYPE "public"."blog_status" AS ENUM('draft', 'in_review', 'changes_requested', 'approved', 'scheduled', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."blog_version_origin" AS ENUM('imported', 'human_edit', 'ai_draft', 'ai_assist');--> statement-breakpoint
CREATE TABLE "blog_post_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"meta_description" text,
	"body" text DEFAULT '' NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cover_image" text,
	"cover_alt" text,
	"content_hash" text NOT NULL,
	"origin" "blog_version_origin" NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"status" "blog_status" DEFAULT 'draft' NOT NULL,
	"author_id" uuid,
	"brief" jsonb,
	"current_version_id" uuid,
	"approved_version_id" uuid,
	"published_version_id" uuid,
	"scheduled_for" timestamp with time zone,
	"first_published_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"submitted_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blog_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"decision" "blog_review_decision" NOT NULL,
	"comment" text,
	"checklist" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "blog_reviewer" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "blog_post_versions" ADD CONSTRAINT "blog_post_versions_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_versions" ADD CONSTRAINT "blog_post_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_current_version_id_blog_post_versions_id_fk" FOREIGN KEY ("current_version_id") REFERENCES "public"."blog_post_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_approved_version_id_blog_post_versions_id_fk" FOREIGN KEY ("approved_version_id") REFERENCES "public"."blog_post_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_published_version_id_blog_post_versions_id_fk" FOREIGN KEY ("published_version_id") REFERENCES "public"."blog_post_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_reviews" ADD CONSTRAINT "blog_reviews_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_reviews" ADD CONSTRAINT "blog_reviews_version_id_blog_post_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."blog_post_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_reviews" ADD CONSTRAINT "blog_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blog_post_versions_number" ON "blog_post_versions" USING btree ("post_id","number");--> statement-breakpoint
CREATE INDEX "blog_posts_status_idx" ON "blog_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blog_posts_published_idx" ON "blog_posts" USING btree ("published_version_id");--> statement-breakpoint
CREATE INDEX "blog_reviews_post_idx" ON "blog_reviews" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "blog_reviews_version_idx" ON "blog_reviews" USING btree ("version_id");