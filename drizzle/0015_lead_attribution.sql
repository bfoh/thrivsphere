-- How people found ThriveSphere (marketing hub R0).
--
-- One row per enquiry, callback or paid consultation: the optional answer to
-- "How did you hear about us?" and the tracking tags on the link the person
-- arrived by, read from the form page's address. Nothing is stored on the
-- visitor's device.
--
-- Only adds. No existing rows change.
CREATE TYPE "public"."heard_via" AS ENUM('search_engine', 'google_maps', 'instagram', 'facebook', 'linkedin', 'blog', 'newsletter', 'friend_or_family', 'employer_or_hr', 'health_professional', 'event_or_talk', 'other', 'prefer_not_to_say');--> statement-breakpoint
CREATE TABLE "lead_attributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enquiry_id" uuid,
	"order_id" uuid,
	"heard_via" "heard_via",
	"heard_via_detail" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_content" text,
	"landing_path" text,
	"referrer_host" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_attributions_one_subject" CHECK (num_nonnulls("lead_attributions"."enquiry_id", "lead_attributions"."order_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "lead_attributions" ADD CONSTRAINT "lead_attributions_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_attributions" ADD CONSTRAINT "lead_attributions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_attributions_enquiry_idx" ON "lead_attributions" USING btree ("enquiry_id");--> statement-breakpoint
CREATE INDEX "lead_attributions_order_idx" ON "lead_attributions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "lead_attributions_campaign_idx" ON "lead_attributions" USING btree ("utm_campaign");--> statement-breakpoint
CREATE INDEX "lead_attributions_created_idx" ON "lead_attributions" USING btree ("created_at");