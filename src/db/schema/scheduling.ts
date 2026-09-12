import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./identity";
import { clients } from "./clients";
import { packages, services } from "./commerce";

/**
 * Recurring weekly availability for a practitioner.
 *
 * Stored as local wall-clock time plus an IANA timezone rather than UTC
 * instants, so "Tuesdays 18:00" keeps meaning 6pm through a BST/GMT change.
 */
export const availabilityRules = pgTable(
  "availability_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    practitionerId: uuid("practitioner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 0 = Sunday … 6 = Saturday. */
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    timezone: text("timezone").notNull().default("Europe/London"),
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("availability_practitioner_idx").on(t.practitionerId)]
);

/** One-off overrides: holidays, or extra hours on a given date. */
export const availabilityExceptions = pgTable(
  "availability_exceptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    practitionerId: uuid("practitioner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    /** True blocks the day entirely; false opens the given window. */
    blocked: boolean("blocked").notNull().default(true),
    startTime: time("start_time"),
    endTime: time("end_time"),
    reason: text("reason"),
  },
  (t) => [index("availability_exceptions_idx").on(t.practitionerId, t.date)]
);

export const appointmentStatus = pgEnum("appointment_status", [
  "scheduled",
  "completed",
  "cancelled_by_client",
  "cancelled_by_service",
  "no_show",
]);

/**
 * Video provider for a session.
 *
 * At launch every appointment carries a link to an external meeting room that
 * the practitioner pastes in. `provider` exists so an embedded provider can be
 * added later without migrating existing appointments.
 */
export const meetingProvider = pgEnum("meeting_provider", [
  "external_link",
  "daily",
  "whereby",
]);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    practitionerId: uuid("practitioner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    /** Which prepaid block this session draws down from. */
    packageId: uuid("package_id").references(() => packages.id, { onDelete: "set null" }),

    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: appointmentStatus("status").notNull().default("scheduled"),

    provider: meetingProvider("provider").notNull().default("external_link"),
    /**
     * Encrypted at rest and only ever rendered inside the authenticated portal.
     * It is deliberately never included in any email: a joining link in an
     * inbox is a confidentiality risk for someone whose email may be monitored.
     */
    meetingLinkEncrypted: text("meeting_link_encrypted"),

    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    /** Whether a late cancellation or no-show consumed a session. */
    chargedToPackage: boolean("charged_to_package").notNull().default(false),

    attendedAt: timestamp("attended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("appointments_client_idx").on(t.clientId),
    index("appointments_practitioner_idx").on(t.practitionerId),
    index("appointments_starts_idx").on(t.startsAt),
    index("appointments_status_idx").on(t.status),
  ]
);

export const reminderKind = pgEnum("reminder_kind", [
  "booking_confirmation",
  "reminder_24h",
  "reminder_1h",
  "cancellation",
  "rebook_prompt",
]);

/**
 * Record of notifications already sent.
 *
 * The reminder cron is at-least-once, so it checks this table before sending.
 * Being reminded twice about a wellbeing appointment is not harmless — it can
 * expose the appointment to whoever else sees that inbox.
 */
export const remindersSent = pgTable(
  "reminders_sent",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    kind: reminderKind("kind").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reminders_appointment_idx").on(t.appointmentId, t.kind)]
);
