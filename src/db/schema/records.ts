import {
  index,
  integer,
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
 * Session notes.
 *
 * Append-only by design. A care record that can be quietly rewritten is worth
 * very little if it is ever questioned, so notes are never updated in place:
 * corrections are added to `sessionNoteAmendments` and the original text stays
 * exactly as first written. `supersededAt` marks a note as amended without
 * destroying it.
 */
export const sessionNotes = pgTable(
  "session_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    /** Agreed actions or goals arising from the session. */
    agreedActions: text("agreed_actions"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** Set when an amendment is added. The original row is never edited. */
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
  },
  (t) => [
    index("session_notes_client_idx").on(t.clientId),
    index("session_notes_appointment_idx").on(t.appointmentId),
  ]
);

/** Corrections to a note, kept alongside rather than replacing the original. */
export const sessionNoteAmendments = pgTable(
  "session_note_amendments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    noteId: uuid("note_id")
      .notNull()
      .references(() => sessionNotes.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    /** Why the amendment was needed — required for a defensible record. */
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("note_amendments_note_idx").on(t.noteId)]
);

export const progressMeasure = pgEnum("progress_measure", [
  "wellbeing",
  "confidence",
  "resilience",
  "isolation",
  "goal_progress",
]);

/**
 * Simple progress tracking.
 *
 * Deliberately a self-rated 0–10 scale rather than a clinical instrument:
 * ThrivSphere is a non-clinical service and must not appear to be administering
 * a diagnostic measure.
 */
export const progressEntries = pgTable(
  "progress_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    measure: progressMeasure("measure").notNull(),
    /** Self-rated 0–10. */
    score: integer("score").notNull(),
    note: text("note"),
    recordedBy: uuid("recorded_by").references(() => users.id, { onDelete: "set null" }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("progress_client_idx").on(t.clientId)]
);
