-- Emergency Contact / Next of Kin (IT handover §15.2–15.4).
--
-- clients: the client's answer (provided / unable / prefer_not; null until
--   asked), alternative phone or email, country and time zone, preferred
--   contact method, and the "I have informed this person" acknowledgement.
--   Name, relationship and phone already exist.
--
-- Only adds. No existing rows change.
CREATE TYPE "public"."emergency_contact_method" AS ENUM('phone', 'email', 'other');--> statement-breakpoint
CREATE TYPE "public"."emergency_contact_status" AS ENUM('provided', 'unable', 'prefer_not');--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "emergency_contact_status" "emergency_contact_status";--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "emergency_contact_alt" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "emergency_contact_country" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "emergency_contact_time_zone" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "emergency_contact_method" "emergency_contact_method";--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "emergency_contact_method_other" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "emergency_contact_informed" boolean;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "emergency_contact_updated_at" timestamp with time zone;