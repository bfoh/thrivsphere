-- Readers' likes and comments on blog posts.
--
-- Comments are held until staff approve them. The commenter's email is
-- stored encrypted and never shown. Likes are one per browser per post,
-- keyed by a hash of a random id the browser keeps in a cookie.
--
-- Only adds. No existing rows change.
CREATE TYPE "public"."blog_comment_status" AS ENUM('pending', 'approved', 'hidden');--> statement-breakpoint
CREATE TABLE "blog_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"email_enc" text NOT NULL,
	"body" text NOT NULL,
	"status" "blog_comment_status" DEFAULT 'pending' NOT NULL,
	"needs_attention" boolean DEFAULT false NOT NULL,
	"flags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"moderated_by" uuid,
	"moderated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "blog_likes" (
	"post_id" uuid NOT NULL,
	"reader_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_likes_post_id_reader_hash_pk" PRIMARY KEY("post_id","reader_hash")
);
--> statement-breakpoint
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_likes" ADD CONSTRAINT "blog_likes_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blog_comments_post_idx" ON "blog_comments" USING btree ("post_id","status");--> statement-breakpoint
CREATE INDEX "blog_comments_queue_idx" ON "blog_comments" USING btree ("status","created_at");