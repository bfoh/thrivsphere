-- Dual booking (IT handover, 15 November 2026, §19) and the enquiry queue (§16).
--
-- Adds a `pending_payment` hold so a time can be kept for a client while they
-- pay at Stripe, links holds to their order, stores every enquiry with a
-- reference and a contact history, and makes two duplicates impossible: a
-- second client record for one sign-in, and a second package for one payment.
--
-- Only adds. The two existing appointments, four orders and two clients are
-- untouched; the tables gaining NOT NULL columns (enquiries) are empty.

CREATE TYPE "public"."enquiry_category" AS ENUM('individual', 'corporate', 'general', 'existing_client', 'other', 'callback');--> statement-breakpoint
CREATE TYPE "public"."enquiry_event_kind" AS ENUM('received', 'status', 'assigned', 'note', 'contact', 'booking_link', 'linked');--> statement-breakpoint
ALTER TYPE "public"."consent_type" ADD VALUE 'booking_terms';--> statement-breakpoint
ALTER TYPE "public"."enquiry_status" ADD VALUE 'in_progress';--> statement-breakpoint
ALTER TYPE "public"."enquiry_status" ADD VALUE 'awaiting_client';--> statement-breakpoint
ALTER TYPE "public"."appointment_status" ADD VALUE 'pending_payment';--> statement-breakpoint
CREATE TABLE "enquiry_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enquiry_id" uuid NOT NULL,
	"actor_id" uuid,
	"kind" "enquiry_event_kind" NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "clients_user_idx";--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "reference" text NOT NULL;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "category" "enquiry_category" DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "preferred_contact" text;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "subject" text;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "confirmed_adult" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "privacy_acknowledged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "assigned_to" uuid;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "order_id" uuid;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "hold_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "enquiry_events" ADD CONSTRAINT "enquiry_events_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiry_events" ADD CONSTRAINT "enquiry_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enquiry_events_enquiry_idx" ON "enquiry_events" USING btree ("enquiry_id","created_at");--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clients_user_unique" ON "clients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "enquiries_email_idx" ON "enquiries" USING btree ("email");--> statement-breakpoint
CREATE INDEX "enquiries_created_idx" ON "enquiries" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "packages_order_unique" ON "packages" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "appointments_order_idx" ON "appointments" USING btree ("order_id");--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_reference_unique" UNIQUE("reference");
--> statement-breakpoint
-- A time being paid for must block the slot exactly like a booking, or two
-- clients could pay for the same session. The rule now covers every
-- appointment that is not closed. It names the closed statuses rather than
-- `pending_payment`, because Postgres cannot use an enum value in the same
-- transaction that adds it.
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_no_overlap";
--> statement-breakpoint
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist (
    "practitioner_id" WITH =,
    tstzrange("starts_at", "ends_at") WITH &&
  ) WHERE ("status" NOT IN ('completed', 'cancelled_by_client', 'cancelled_by_service', 'no_show'));
