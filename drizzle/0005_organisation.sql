CREATE TYPE "public"."absence_type" AS ENUM('annual_leave', 'sick', 'training', 'parental', 'compassionate', 'unpaid', 'other');--> statement-breakpoint
CREATE TYPE "public"."contract_type" AS ENUM('employee', 'self_employed', 'volunteer', 'sessional', 'director');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('software', 'insurance', 'supervision', 'training', 'marketing', 'professional_fees', 'equipment', 'premises', 'travel', 'bank_charges', 'other');--> statement-breakpoint
-- Already applied by 0003/0004, which were written by hand and so are not in
-- the snapshot drizzle-kit compares against. Guarded rather than deleted, so a
-- database restored from before those migrations still ends up correct.
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'logout';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'founder';--> statement-breakpoint
CREATE TABLE "absences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "absence_type" NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"notes" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incurred_on" date NOT NULL,
	"category" "expense_category" DEFAULT 'other' NOT NULL,
	"description" text NOT NULL,
	"supplier" text,
	"amount_pence" integer NOT NULL,
	"vat_pence" integer DEFAULT 0 NOT NULL,
	"receipt_path" text,
	"notes" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_title" text,
	"contract" "contract_type" DEFAULT 'self_employed' NOT NULL,
	"started_on" date,
	"ended_on" date,
	"dbs_number" text,
	"dbs_checked_on" date,
	"dbs_review_due" date,
	"supervision_due" date,
	"supervisor_name" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "training_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course" text NOT NULL,
	"provider" text,
	"completed_on" date NOT NULL,
	"expires_on" date,
	"certificate_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Also already applied, by 0002. Guarded for the same reason as the enum
-- values above: re-emitted here because the hand-written migration never
-- reached drizzle-kit's snapshot, and an unguarded re-run aborts the whole
-- transaction and silently applies none of this file.
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "email_reminders_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "absences" ADD CONSTRAINT "absences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absences" ADD CONSTRAINT "absences_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "absences_user_idx" ON "absences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "absences_start_idx" ON "absences" USING btree ("starts_on");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("incurred_on");--> statement-breakpoint
CREATE INDEX "expenses_category_idx" ON "expenses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "staff_profiles_user_idx" ON "staff_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "training_user_idx" ON "training_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "training_expiry_idx" ON "training_records" USING btree ("expires_on");