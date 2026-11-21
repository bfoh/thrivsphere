-- Discounts: client concessions, discount codes and free sessions.
--
-- A discount is worked out on our server and the reduced price is what is
-- charged at Stripe, so `orders.amount_pence` stays what was actually paid
-- and refunds and revenue keep working unchanged. The order also records the
-- full price, the discount used and its label; free sessions are a £0 order
-- marked complimentary.
--
-- Only adds. Existing orders keep a null full price and no discount.
CREATE TYPE "public"."discount_kind" AS ENUM('client', 'code');--> statement-breakpoint
CREATE TYPE "public"."discount_reason" AS ENUM('financial_hardship', 'goodwill', 'partner_referral', 'other');--> statement-breakpoint
CREATE TABLE "discounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "discount_kind" NOT NULL,
	"client_id" uuid,
	"code" text,
	"label" text NOT NULL,
	"percent_off" integer,
	"amount_off_pence" integer,
	"plan_slugs" text[],
	"max_uses" integer,
	"max_uses_per_client" integer,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"reason" "discount_reason",
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_by" uuid,
	"ended_at" timestamp with time zone,
	CONSTRAINT "discounts_code_unique" UNIQUE("code"),
	CONSTRAINT "discounts_one_amount" CHECK (("discounts"."percent_off" is null) <> ("discounts"."amount_off_pence" is null)),
	CONSTRAINT "discounts_kind_target" CHECK (("discounts"."kind" = 'client' and "discounts"."client_id" is not null and "discounts"."code" is null) or ("discounts"."kind" = 'code' and "discounts"."code" is not null and "discounts"."client_id" is null))
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "list_price_pence" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_pence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_label" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "complimentary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_ended_by_users_id_fk" FOREIGN KEY ("ended_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discounts_client_idx" ON "discounts" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "discounts_one_concession" ON "discounts" USING btree ("client_id") WHERE "discounts"."kind" = 'client' and "discounts"."active";--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_discount_idx" ON "orders" USING btree ("discount_id");