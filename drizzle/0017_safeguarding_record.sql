-- Safeguarding Incident / Concern Record (the owner's form, 21 November 2026).
--
-- safeguarding_concerns: replaces the short concern form with the form's nine
--   sections. Removes the risk level (low / medium / high / immediate): the
--   form says not to score risk. Keeps detail, status, escalated_to/at (the
--   external service in section 6), the reason for sharing without agreement,
--   and the closing outcome.
-- risk_flags: no level or category; each flag points at the record that raised
--   it (concern_id).
-- users.safeguarding_deputy: the Deputy Safeguarding Lead, set by the founder.
--
-- Drops columns, so it refuses to run if any concern or flag exists (there
-- were none when this was written).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "safeguarding_concerns") OR EXISTS (SELECT 1 FROM "risk_flags") THEN
    RAISE EXCEPTION 'safeguarding records exist: this migration would drop their risk levels and categories. Stop and plan a conversion.';
  END IF;
END $$;--> statement-breakpoint
DROP INDEX "concerns_category_idx";--> statement-breakpoint
ALTER TABLE "risk_flags" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "risk_flags" DROP COLUMN "level";--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" DROP COLUMN "level";--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" DROP COLUMN "immediate_action";--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" DROP COLUMN "client_informed";--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" DROP COLUMN "consent_to_share";--> statement-breakpoint
DROP TYPE "public"."concern_category";--> statement-breakpoint
DROP TYPE "public"."risk_level";--> statement-breakpoint
CREATE TYPE "public"."client_agreement" AS ENUM('yes', 'no', 'not_applicable');--> statement-breakpoint
CREATE TYPE "public"."immediate_threat" AS ENUM('no', 'yes', 'unclear');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "safeguarding_deputy" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "risk_flags" ADD COLUMN "concern_id" uuid;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "occurred_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "practitioner_id" uuid;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "client_location" text;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "arose" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "arose_other" text;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "concern_types" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "concern_type_other" text;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "immediate_threat" "immediate_threat" NOT NULL;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "immediate_threat_info" text NOT NULL;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "client_wishes" text;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "agreed_actions" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "agreed_action_other" text;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "agreed_action_details" text;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "trusted_person_required" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "trusted_person_agreed" "client_agreement";--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "trusted_person_contacted" text;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "trusted_person_outcome" text;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "external_contacted" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "information_shared" text;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "sharing_reason" text;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "sharing_client_informed" boolean;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "discussed_internally" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "discussed_with" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "discussed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "internal_advice" text;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "contact_outcome" text;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "next_steps" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "next_step_other" text;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "follow_up_action" text;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "follow_up_by" text;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "follow_up_date" date;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "additional_info" text;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD COLUMN "initials" text NOT NULL;--> statement-breakpoint
ALTER TABLE "risk_flags" ADD CONSTRAINT "risk_flags_concern_id_safeguarding_concerns_id_fk" FOREIGN KEY ("concern_id") REFERENCES "public"."safeguarding_concerns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD CONSTRAINT "safeguarding_concerns_practitioner_id_users_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
