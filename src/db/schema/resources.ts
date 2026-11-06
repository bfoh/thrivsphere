import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./identity";
import { clients } from "./clients";
import { appointments } from "./scheduling";

/**
 * Practice resources: the supervision & next-session planning sheet, and the
 * worksheets practitioners set for clients.
 *
 * Answers are stored as JSON with the template key and version they were given
 * against — the same approach as intake — so a record keeps reading against
 * the questions actually asked after the wording changes.
 *
 * Both are care records and follow the same rules as session notes: reached
 * only through the access guard, every read and write audited, and nothing
 * finalised is rewritten. `revision` lets two colleagues work on one draft
 * without one silently overwriting the other.
 */

export const supervisionStatus = pgEnum("supervision_status", ["draft", "final"]);

export const supervisionRecords = pgTable(
  "supervision_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    /** The completed session under review. */
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    /** Who ran the session. */
    practitionerId: uuid("practitioner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    templateKey: text("template_key").notNull(),
    templateVersion: integer("template_version").notNull(),
    answers: jsonb("answers").notNull().default({}),
    status: supervisionStatus("status").notNull().default("draft"),
    supervisionDate: date("supervision_date").notNull(),
    /** Section 3 flagged a risk, signposting or scope question. */
    needsFollowUp: boolean("needs_follow_up").notNull().default(false),
    revision: integer("revision").notNull().default(1),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    finalisedAt: timestamp("finalised_at", { withTimezone: true }),
    finalisedBy: uuid("finalised_by").references(() => users.id, { onDelete: "restrict" }),
  },
  (t) => [
    index("supervision_client_idx").on(t.clientId),
    index("supervision_appointment_idx").on(t.appointmentId),
    index("supervision_status_idx").on(t.status),
  ]
);

/** Corrections to a finalised sheet, kept beside it rather than replacing it. */
export const supervisionRecordAmendments = pgTable(
  "supervision_record_amendments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recordId: uuid("record_id")
      .notNull()
      .references(() => supervisionRecords.id, { onDelete: "restrict" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    /** Why the amendment was needed. */
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("supervision_amendments_record_idx").on(t.recordId)]
);

/**
 * "Who will prepare what?" — made into tasks when a sheet is finalised, so a
 * colleague can tick one off without unlocking the sheet it came from.
 */
export const preparationTasks = pgTable(
  "preparation_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recordId: uuid("record_id")
      .notNull()
      .references(() => supervisionRecords.id, { onDelete: "restrict" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    description: text("description").notNull(),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "restrict" }),
    dueBy: date("due_by"),
    doneAt: timestamp("done_at", { withTimezone: true }),
    doneBy: uuid("done_by").references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("preparation_tasks_record_idx").on(t.recordId),
    index("preparation_tasks_assignee_idx").on(t.assigneeId),
  ]
);

export const worksheetStatus = pgEnum("worksheet_status", [
  "assigned",
  "in_progress",
  "submitted",
  "reviewed",
  "withdrawn",
]);

/** A worksheet set for one client, and their answers to it. */
export const worksheetAssignments = pgTable(
  "worksheet_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    templateKey: text("template_key").notNull(),
    templateVersion: integer("template_version").notNull(),
    /** A short line from the practitioner, shown to the client. */
    note: text("note"),
    answers: jsonb("answers").notNull().default({}),
    status: worksheetStatus("status").notNull().default("assigned"),
    revision: integer("revision").notNull().default(1),
    assignedBy: uuid("assigned_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    /** Who last saved answers: the client, or a practitioner entering them with the client. */
    lastEditedBy: uuid("last_edited_by").references(() => users.id, { onDelete: "restrict" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submittedBy: uuid("submitted_by").references(() => users.id, { onDelete: "restrict" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "restrict" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("worksheet_assignments_client_idx").on(t.clientId),
    index("worksheet_assignments_status_idx").on(t.status),
  ]
);
