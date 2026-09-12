import {
  boolean,
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

/**
 * The categories the brief requires ThrivSphere to be able to record and
 * escalate. Kept as an enum so that reporting can count them reliably.
 */
export const concernCategory = pgEnum("concern_category", [
  "adult_safeguarding",
  "domestic_abuse",
  "suicide_self_harm",
  "immediate_danger",
  "child_at_risk",
  "other",
]);

export const riskLevel = pgEnum("risk_level", ["low", "medium", "high", "immediate"]);

export const concernStatus = pgEnum("concern_status", [
  "open",
  "escalated",
  "monitoring",
  "closed",
]);

/**
 * A standing risk flag on a client record.
 *
 * Separate from `safeguardingConcerns`: a concern is an event that happened, a
 * flag is a state that persists. A practitioner opening a record needs to see
 * the flag before the session starts, not discover it by reading history.
 */
export const riskFlags = pgTable(
  "risk_flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    category: concernCategory("category").notNull(),
    level: riskLevel("level").notNull().default("low"),
    summary: text("summary").notNull(),
    active: boolean("active").notNull().default(true),
    raisedBy: uuid("raised_by").references(() => users.id, { onDelete: "set null" }),
    raisedAt: timestamp("raised_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    clearedAt: timestamp("cleared_at", { withTimezone: true }),
  },
  (t) => [
    index("risk_flags_client_idx").on(t.clientId),
    index("risk_flags_active_idx").on(t.active),
  ]
);

/**
 * A safeguarding concern and what was done about it.
 *
 * The fields follow what a safeguarding review actually asks: what was
 * disclosed, what immediate action was taken, whether the client knew, who it
 * was escalated to and when, and what the outcome was. `escalatedTo` is free
 * text because it may be a local authority team, the police, or a GP.
 */
export const safeguardingConcerns = pgTable(
  "safeguarding_concerns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    category: concernCategory("category").notNull(),
    level: riskLevel("level").notNull(),
    status: concernStatus("status").notNull().default("open"),

    detail: text("detail").notNull(),
    immediateAction: text("immediate_action"),
    /** Whether consent to share was sought, and what the client said. */
    clientInformed: boolean("client_informed").notNull().default(false),
    consentToShare: boolean("consent_to_share"),
    /** Recorded when information is shared without consent — this needs a reason. */
    sharedWithoutConsentReason: text("shared_without_consent_reason"),

    escalatedTo: text("escalated_to"),
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),
    outcome: text("outcome"),

    raisedBy: uuid("raised_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    raisedAt: timestamp("raised_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: uuid("closed_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    index("concerns_client_idx").on(t.clientId),
    index("concerns_status_idx").on(t.status),
    index("concerns_category_idx").on(t.category),
  ]
);

export const incidentType = pgEnum("incident_type", [
  "safeguarding",
  "data_breach",
  "technical_failure",
  "boundary_violation",
  "complaint",
  "other",
]);

/**
 * Incident log.
 *
 * Covers data breaches as well as safeguarding incidents — UK GDPR gives 72
 * hours to report a reportable breach to the ICO, and that clock starts at
 * `occurredAt`, so both timestamps are recorded separately.
 */
export const incidents = pgTable(
  "incidents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Null where the incident is not about a specific client. */
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    type: incidentType("type").notNull(),
    summary: text("summary").notNull(),
    detail: text("detail"),
    actionsTaken: text("actions_taken"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    reportedBy: uuid("reported_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    reportedAt: timestamp("reported_at", { withTimezone: true }).notNull().defaultNow(),
    /** Set when a data breach is judged reportable to the ICO. */
    reportedToIcoAt: timestamp("reported_to_ico_at", { withTimezone: true }),
    status: concernStatus("status").notNull().default("open"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [index("incidents_type_idx").on(t.type)]
);

/**
 * The organisations we signpost to.
 *
 * Seeded from `signposts` in src/data/site.ts so the public directory and the
 * admin referral picker cannot drift apart — a referral recorded against a
 * real row can be reported on; free text cannot.
 */
export const signpostOrganisations = pgTable(
  "signpost_organisations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    phone: text("phone"),
    url: text("url"),
    detail: text("detail").notNull(),
    urgent: boolean("urgent").notNull().default(false),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("signpost_category_idx").on(t.category)]
);

export const referralOutcome = pgEnum("referral_outcome", [
  "pending",
  "accepted",
  "declined",
  "client_did_not_engage",
  "unknown",
]);

/**
 * A referral or signpost made for a client.
 *
 * Recording these is what lets the CIC show that people whose needs fell
 * outside scope were directed somewhere appropriate rather than simply turned
 * away — and it is the basis of the signposting figures in reporting.
 */
export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    /** Preferred: a real directory row. */
    organisationId: uuid("organisation_id").references(() => signpostOrganisations.id, {
      onDelete: "set null",
    }),
    /** Fallback for a service not in the directory, e.g. a named local team. */
    organisationName: text("organisation_name"),
    reason: text("reason").notNull(),
    outcome: referralOutcome("outcome").notNull().default("pending"),
    madeBy: uuid("made_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    madeAt: timestamp("made_at", { withTimezone: true }).notNull().defaultNow(),
    followedUpAt: timestamp("followed_up_at", { withTimezone: true }),
    notes: text("notes"),
  },
  (t) => [index("referrals_client_idx").on(t.clientId)]
);
