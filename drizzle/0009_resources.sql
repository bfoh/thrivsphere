CREATE TYPE "public"."supervision_status" AS ENUM('draft', 'final');--> statement-breakpoint
CREATE TYPE "public"."worksheet_status" AS ENUM('assigned', 'in_progress', 'submitted', 'reviewed', 'withdrawn');--> statement-breakpoint
CREATE TABLE "preparation_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"description" text NOT NULL,
	"assignee_id" uuid,
	"due_by" date,
	"done_at" timestamp with time zone,
	"done_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supervision_record_amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supervision_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"appointment_id" uuid,
	"practitioner_id" uuid NOT NULL,
	"template_key" text NOT NULL,
	"template_version" integer NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "supervision_status" DEFAULT 'draft' NOT NULL,
	"supervision_date" date NOT NULL,
	"needs_follow_up" boolean DEFAULT false NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finalised_at" timestamp with time zone,
	"finalised_by" uuid
);
--> statement-breakpoint
CREATE TABLE "worksheet_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"appointment_id" uuid,
	"template_key" text NOT NULL,
	"template_version" integer NOT NULL,
	"note" text,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "worksheet_status" DEFAULT 'assigned' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"assigned_by" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"last_edited_by" uuid,
	"submitted_at" timestamp with time zone,
	"submitted_by" uuid,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "preparation_tasks" ADD CONSTRAINT "preparation_tasks_record_id_supervision_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."supervision_records"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparation_tasks" ADD CONSTRAINT "preparation_tasks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparation_tasks" ADD CONSTRAINT "preparation_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparation_tasks" ADD CONSTRAINT "preparation_tasks_done_by_users_id_fk" FOREIGN KEY ("done_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_record_amendments" ADD CONSTRAINT "supervision_record_amendments_record_id_supervision_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."supervision_records"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_record_amendments" ADD CONSTRAINT "supervision_record_amendments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_records" ADD CONSTRAINT "supervision_records_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_records" ADD CONSTRAINT "supervision_records_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_records" ADD CONSTRAINT "supervision_records_practitioner_id_users_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_records" ADD CONSTRAINT "supervision_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_records" ADD CONSTRAINT "supervision_records_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervision_records" ADD CONSTRAINT "supervision_records_finalised_by_users_id_fk" FOREIGN KEY ("finalised_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worksheet_assignments" ADD CONSTRAINT "worksheet_assignments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worksheet_assignments" ADD CONSTRAINT "worksheet_assignments_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worksheet_assignments" ADD CONSTRAINT "worksheet_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worksheet_assignments" ADD CONSTRAINT "worksheet_assignments_last_edited_by_users_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worksheet_assignments" ADD CONSTRAINT "worksheet_assignments_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worksheet_assignments" ADD CONSTRAINT "worksheet_assignments_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "preparation_tasks_record_idx" ON "preparation_tasks" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "preparation_tasks_assignee_idx" ON "preparation_tasks" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "supervision_amendments_record_idx" ON "supervision_record_amendments" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "supervision_client_idx" ON "supervision_records" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "supervision_appointment_idx" ON "supervision_records" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "supervision_status_idx" ON "supervision_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "worksheet_assignments_client_idx" ON "worksheet_assignments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "worksheet_assignments_status_idx" ON "worksheet_assignments" USING btree ("status");