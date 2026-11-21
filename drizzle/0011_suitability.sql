-- Suitability after the initial consultation (IT handover §13.1, §19).
--
-- Each appointment now says what it is: the paid Initial Wellbeing
-- Consultation or an ongoing session. The practitioner's decision in the
-- consultation (Suitable / Clarification or further support needed / Not
-- suitable — signpost) is kept append-only, and only Suitable opens booking
-- for £35 sessions.
--
-- Only adds. Existing appointments are named by the rule the website used
-- until now: a client's first appointment that went ahead or is still booked
-- is their initial consultation.
CREATE TYPE "public"."appointment_kind" AS ENUM('initial', 'session');--> statement-breakpoint
CREATE TYPE "public"."suitability_outcome" AS ENUM('suitable', 'clarification', 'not_suitable');--> statement-breakpoint
CREATE TABLE "suitability_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"appointment_id" uuid,
	"outcome" "suitability_outcome" NOT NULL,
	"rationale" text NOT NULL,
	"signposted_to" text,
	"decided_by" uuid NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "kind" "appointment_kind" DEFAULT 'session' NOT NULL;--> statement-breakpoint
ALTER TABLE "suitability_decisions" ADD CONSTRAINT "suitability_decisions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suitability_decisions" ADD CONSTRAINT "suitability_decisions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suitability_decisions" ADD CONSTRAINT "suitability_decisions_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "suitability_client_idx" ON "suitability_decisions" USING btree ("client_id","decided_at");
--> statement-breakpoint
UPDATE "appointments" SET "kind" = 'initial'
WHERE "id" IN (
  SELECT DISTINCT ON ("client_id") "id"
  FROM "appointments"
  WHERE "status" NOT IN ('cancelled_by_client', 'cancelled_by_service', 'pending_payment')
  ORDER BY "client_id", "starts_at"
);
