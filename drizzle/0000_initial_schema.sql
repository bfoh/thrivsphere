CREATE TYPE "public"."audit_action" AS ENUM('view', 'create', 'update', 'delete', 'export', 'login', 'permission_denied');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('client', 'practitioner', 'supervisor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('enquiry', 'registered', 'active', 'paused', 'discharged', 'declined');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('age_18_plus', 'terms', 'privacy', 'confidentiality_limits', 'consent_to_support', 'marketing');--> statement-breakpoint
CREATE TYPE "public"."document_category" AS ENUM('intake', 'consent', 'correspondence', 'resource', 'safeguarding', 'other');--> statement-breakpoint
CREATE TYPE "public"."enquiry_status" AS ENUM('new', 'responded', 'converted', 'signposted', 'closed');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'failed', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."package_status" AS ENUM('active', 'exhausted', 'expired', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."service_kind" AS ENUM('one_to_one', 'group', 'webinar', 'course');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'completed', 'cancelled_by_client', 'cancelled_by_service', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."meeting_provider" AS ENUM('external_link', 'daily', 'whereby');--> statement-breakpoint
CREATE TYPE "public"."reminder_kind" AS ENUM('booking_confirmation', 'reminder_24h', 'reminder_1h', 'cancellation', 'rebook_prompt');--> statement-breakpoint
CREATE TYPE "public"."progress_measure" AS ENUM('wellbeing', 'confidence', 'resilience', 'isolation', 'goal_progress');--> statement-breakpoint
CREATE TYPE "public"."concern_category" AS ENUM('adult_safeguarding', 'domestic_abuse', 'suicide_self_harm', 'immediate_danger', 'child_at_risk', 'other');--> statement-breakpoint
CREATE TYPE "public"."concern_status" AS ENUM('open', 'escalated', 'monitoring', 'closed');--> statement-breakpoint
CREATE TYPE "public"."incident_type" AS ENUM('safeguarding', 'data_breach', 'technical_failure', 'boundary_violation', 'complaint', 'other');--> statement-breakpoint
CREATE TYPE "public"."referral_outcome" AS ENUM('pending', 'accepted', 'declined', 'client_did_not_engage', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('low', 'medium', 'high', 'immediate');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" "audit_action" NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"subject_client_id" uuid,
	"detail" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"role" "user_role" DEFAULT 'client' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone,
	CONSTRAINT "users_auth_id_unique" UNIQUE("auth_id")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"preferred_name" text NOT NULL,
	"legal_name" text,
	"date_of_birth" date,
	"confirmed_adult" boolean DEFAULT false NOT NULL,
	"confirmed_adult_at" timestamp with time zone,
	"gender_self_described" text,
	"pronouns" text,
	"email" text NOT NULL,
	"phone" text,
	"safe_to_contact_by_phone" boolean DEFAULT false NOT NULL,
	"contact_notes" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"emergency_contact_relationship" text,
	"gp_practice" text,
	"gp_phone" text,
	"status" "client_status" DEFAULT 'registered' NOT NULL,
	"referred_on_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scheduled_deletion_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"type" "consent_type" NOT NULL,
	"policy_slug" text,
	"policy_version" text,
	"granted" boolean DEFAULT true NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"ip_address" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"category" "document_category" DEFAULT 'other' NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" text,
	"blob_path" text NOT NULL,
	"uploaded_by" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"visible_to_client" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"service_interest" text,
	"message" text,
	"preferred_times" text,
	"status" "enquiry_status" DEFAULT 'new' NOT NULL,
	"handled_by" uuid,
	"handled_at" timestamp with time zone,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"form_version" text NOT NULL,
	"answers" jsonb NOT NULL,
	"presenting_concern" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "secure_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"price_plan_id" uuid,
	"plan_name_at_purchase" text NOT NULL,
	"amount_pence" integer NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"checkout_session_id" text,
	"payment_intent_id" text,
	"processed_event_id" text,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"refund_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_checkout_session_id_unique" UNIQUE("checkout_session_id"),
	CONSTRAINT "orders_processed_event_id_unique" UNIQUE("processed_event_id")
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"order_id" uuid,
	"service_id" uuid,
	"sessions_total" integer NOT NULL,
	"sessions_used" integer DEFAULT 0 NOT NULL,
	"status" "package_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"blurb" text,
	"amount_pence" integer NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"sessions" integer DEFAULT 1 NOT NULL,
	"validity_days" integer,
	"featured" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"kind" "service_kind" DEFAULT 'one_to_one' NOT NULL,
	"duration_minutes" integer DEFAULT 50 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"practitioner_id" uuid NOT NULL,
	"service_id" uuid,
	"package_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"provider" "meeting_provider" DEFAULT 'external_link' NOT NULL,
	"meeting_link_encrypted" text,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"charged_to_package" boolean DEFAULT false NOT NULL,
	"attended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"practitioner_id" uuid NOT NULL,
	"date" date NOT NULL,
	"blocked" boolean DEFAULT true NOT NULL,
	"start_time" time,
	"end_time" time,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "availability_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"practitioner_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"timezone" text DEFAULT 'Europe/London' NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders_sent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"kind" "reminder_kind" NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"appointment_id" uuid,
	"measure" "progress_measure" NOT NULL,
	"score" integer NOT NULL,
	"note" text,
	"recorded_by" uuid,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_note_amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"appointment_id" uuid,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"agreed_actions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"superseded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid,
	"type" "incident_type" NOT NULL,
	"summary" text NOT NULL,
	"detail" text,
	"actions_taken" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"reported_by" uuid NOT NULL,
	"reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reported_to_ico_at" timestamp with time zone,
	"status" "concern_status" DEFAULT 'open' NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"organisation_id" uuid,
	"organisation_name" text,
	"reason" text NOT NULL,
	"outcome" "referral_outcome" DEFAULT 'pending' NOT NULL,
	"made_by" uuid NOT NULL,
	"made_at" timestamp with time zone DEFAULT now() NOT NULL,
	"followed_up_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "risk_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"category" "concern_category" NOT NULL,
	"level" "risk_level" DEFAULT 'low' NOT NULL,
	"summary" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"raised_by" uuid,
	"raised_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"cleared_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "safeguarding_concerns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"category" "concern_category" NOT NULL,
	"level" "risk_level" NOT NULL,
	"status" "concern_status" DEFAULT 'open' NOT NULL,
	"detail" text NOT NULL,
	"immediate_action" text,
	"client_informed" boolean DEFAULT false NOT NULL,
	"consent_to_share" boolean,
	"shared_without_consent_reason" text,
	"escalated_to" text,
	"escalated_at" timestamp with time zone,
	"outcome" text,
	"raised_by" uuid NOT NULL,
	"raised_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" uuid
);
--> statement-breakpoint
CREATE TABLE "signpost_organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"phone" text,
	"url" text,
	"detail" text NOT NULL,
	"urgent" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "signpost_organisations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secure_messages" ADD CONSTRAINT "secure_messages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secure_messages" ADD CONSTRAINT "secure_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_price_plan_id_price_plans_id_fk" FOREIGN KEY ("price_plan_id") REFERENCES "public"."price_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_plans" ADD CONSTRAINT "price_plans_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_practitioner_id_users_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_practitioner_id_users_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_practitioner_id_users_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders_sent" ADD CONSTRAINT "reminders_sent_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_entries" ADD CONSTRAINT "progress_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_entries" ADD CONSTRAINT "progress_entries_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_entries" ADD CONSTRAINT "progress_entries_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_note_amendments" ADD CONSTRAINT "session_note_amendments_note_id_session_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."session_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_note_amendments" ADD CONSTRAINT "session_note_amendments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_organisation_id_signpost_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."signpost_organisations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_made_by_users_id_fk" FOREIGN KEY ("made_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_flags" ADD CONSTRAINT "risk_flags_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_flags" ADD CONSTRAINT "risk_flags_raised_by_users_id_fk" FOREIGN KEY ("raised_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD CONSTRAINT "safeguarding_concerns_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD CONSTRAINT "safeguarding_concerns_raised_by_users_id_fk" FOREIGN KEY ("raised_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safeguarding_concerns" ADD CONSTRAINT "safeguarding_concerns_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_subject_idx" ON "audit_log" USING btree ("subject_client_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "clients_user_idx" ON "clients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "clients_status_idx" ON "clients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "consents_client_idx" ON "consents" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "consents_type_idx" ON "consents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "documents_client_idx" ON "documents" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "enquiries_status_idx" ON "enquiries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "intake_client_idx" ON "intake_submissions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "secure_messages_client_idx" ON "secure_messages" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "orders_client_idx" ON "orders" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "packages_client_idx" ON "packages" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "packages_status_idx" ON "packages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "price_plans_active_idx" ON "price_plans" USING btree ("active");--> statement-breakpoint
CREATE INDEX "services_active_idx" ON "services" USING btree ("active");--> statement-breakpoint
CREATE INDEX "appointments_client_idx" ON "appointments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "appointments_practitioner_idx" ON "appointments" USING btree ("practitioner_id");--> statement-breakpoint
CREATE INDEX "appointments_starts_idx" ON "appointments" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "appointments_status_idx" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "availability_exceptions_idx" ON "availability_exceptions" USING btree ("practitioner_id","date");--> statement-breakpoint
CREATE INDEX "availability_practitioner_idx" ON "availability_rules" USING btree ("practitioner_id");--> statement-breakpoint
CREATE INDEX "reminders_appointment_idx" ON "reminders_sent" USING btree ("appointment_id","kind");--> statement-breakpoint
CREATE INDEX "progress_client_idx" ON "progress_entries" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "note_amendments_note_idx" ON "session_note_amendments" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "session_notes_client_idx" ON "session_notes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "session_notes_appointment_idx" ON "session_notes" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "incidents_type_idx" ON "incidents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "referrals_client_idx" ON "referrals" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "risk_flags_client_idx" ON "risk_flags" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "risk_flags_active_idx" ON "risk_flags" USING btree ("active");--> statement-breakpoint
CREATE INDEX "concerns_client_idx" ON "safeguarding_concerns" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "concerns_status_idx" ON "safeguarding_concerns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "concerns_category_idx" ON "safeguarding_concerns" USING btree ("category");--> statement-breakpoint
CREATE INDEX "signpost_category_idx" ON "signpost_organisations" USING btree ("category");