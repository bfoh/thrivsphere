import {
  boolean,
  date,
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

/** Section 3 of the record: did there appear to be an immediate threat? */
export const immediateThreat = pgEnum("immediate_threat", ["no", "yes", "unclear"]);

/** Section 5 of the record: did the client agree to a trusted person's involvement? */
export const clientAgreement = pgEnum("client_agreement", ["yes", "no", "not_applicable"]);

export const concernStatus = pgEnum("concern_status", [
  "open",
  "escalated",
  "monitoring",
  "closed",
]);

/**
 * A standing safeguarding flag on a client record.
 *
 * Separate from `safeguardingConcerns`: a concern is an event that happened, a
 * flag is a state that persists. A practitioner opening a record needs to see
 * the flag before the session starts, not discover it by reading history.
 * There is no risk level: ThriveSphere does not score risk. `summary` says why
 * the flag was raised; only the founder or the Deputy Safeguarding Lead can
 * stand it down.
 */
export const riskFlags = pgTable(
  "risk_flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    /** The record that raised it. */
    concernId: uuid("concern_id").references(() => safeguardingConcerns.id, { onDelete: "set null" }),
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
 * A Safeguarding Incident / Concern Record.
 *
 * One row per completed record, following ThriveSphere's own form section by
 * section (the owner's form, 21 November 2026). It documents the concern,
 * decisions and actions; it is not a clinical risk assessment and holds no
 * risk score. Ticked options are stored as keys (see safeguarding-rules.ts),
 * each with its "Other" text.
 *
 * `raisedAt` is when the record was completed; `occurredAt` is when the
 * contact happened. `escalatedTo` / `escalatedAt` are section 6's external
 * service and when it was contacted. `outcome` is written when the concern is
 * closed, separate from section 8's outcome at the end of the contact.
 */
export const safeguardingConcerns = pgTable(
  "safeguarding_concerns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    status: concernStatus("status").notNull().default("open"),

    // 1. Client and session details
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    practitionerId: uuid("practitioner_id").references(() => users.id, { onDelete: "set null" }),
    clientLocation: text("client_location"),

    // 2. Safeguarding / safety concern
    arose: text("arose").array().notNull(),
    aroseOther: text("arose_other"),
    concernTypes: text("concern_types").array().notNull(),
    concernTypeOther: text("concern_type_other"),
    detail: text("detail").notNull(),

    // 3. Immediate safety
    immediateThreat: immediateThreat("immediate_threat").notNull(),
    immediateThreatInfo: text("immediate_threat_info").notNull(),

    // 4. Client's wishes and agreed action
    clientWishes: text("client_wishes"),
    agreedActions: text("agreed_actions").array().notNull(),
    agreedActionOther: text("agreed_action_other"),
    agreedActionDetails: text("agreed_action_details"),

    // 5. Trusted person / emergency contact
    trustedPersonRequired: boolean("trusted_person_required").notNull(),
    trustedPersonAgreed: clientAgreement("trusted_person_agreed"),
    trustedPersonContacted: text("trusted_person_contacted"),
    trustedPersonOutcome: text("trusted_person_outcome"),

    // 6. External service / information sharing
    externalContacted: boolean("external_contacted").notNull(),
    escalatedTo: text("escalated_to"),
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),
    informationShared: text("information_shared"),
    sharingReason: text("sharing_reason"),
    sharingClientInformed: boolean("sharing_client_informed"),
    /** Why sharing without the client's agreement was necessary and proportionate. */
    sharedWithoutConsentReason: text("shared_without_consent_reason"),

    // 7. Internal escalation
    discussedInternally: boolean("discussed_internally").notNull(),
    discussedWith: text("discussed_with").array().notNull(),
    discussedAt: timestamp("discussed_at", { withTimezone: true }),
    internalAdvice: text("internal_advice"),

    // 8. Outcome and ThriveSphere follow-up
    contactOutcome: text("contact_outcome"),
    nextSteps: text("next_steps").array().notNull(),
    nextStepOther: text("next_step_other"),
    followUpAction: text("follow_up_action"),
    followUpBy: text("follow_up_by"),
    followUpDate: date("follow_up_date"),

    // 9. Practitioner record
    additionalInfo: text("additional_info"),
    initials: text("initials").notNull(),

    /** Written when the concern is closed. */
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
