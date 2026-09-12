import {
  boolean,
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./identity";

export const clientStatus = pgEnum("client_status", [
  "enquiry",
  "registered",
  "active",
  "paused",
  "discharged",
  "declined",
]);

/**
 * The client record.
 *
 * Deliberately separate from `users`: a user is someone who can sign in, a
 * client is someone we support. Keeping them apart means a practitioner can
 * later also be a client, and that deleting a login does not destroy a care
 * record we may be required to retain.
 */
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    preferredName: text("preferred_name").notNull(),
    legalName: text("legal_name"),
    dateOfBirth: date("date_of_birth"),

    /**
     * Explicit 18+ confirmation.
     *
     * ThrivSphere is an adults-only service and under-18s must stay blocked
     * until the CIC deliberately enables that provision (brief §8). Storing
     * the confirmation and its timestamp means we can evidence the gate was
     * applied, not merely that it exists in code.
     */
    confirmedAdult: boolean("confirmed_adult").notNull().default(false),
    confirmedAdultAt: timestamp("confirmed_adult_at", { withTimezone: true }),

    /** Optional and self-described — never a required field, never a fixed list. */
    genderSelfDescribed: text("gender_self_described"),
    pronouns: text("pronouns"),

    email: text("email").notNull(),
    phone: text("phone"),
    /** Whether it is safe to leave a voicemail or send a text. Domestic abuse matters. */
    safeToContactByPhone: boolean("safe_to_contact_by_phone").notNull().default(false),
    /**
     * Appointment reminders by email.
     *
     * An email from a wellbeing service is a disclosure in itself to anyone
     * else reading that inbox, however neutrally it is worded. The client
     * controls this from their own portal.
     */
    emailRemindersEnabled: boolean("email_reminders_enabled").notNull().default(true),
    contactNotes: text("contact_notes"),

    /** Kept for safeguarding escalation, not for marketing. */
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    emergencyContactRelationship: text("emergency_contact_relationship"),
    gpPractice: text("gp_practice"),
    gpPhone: text("gp_phone"),

    status: clientStatus("status").notNull().default("registered"),
    /** Set when the client's needs fall outside scope and they were signposted on. */
    referredOnAt: timestamp("referred_on_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    /** Set by the retention job rather than deleting rows outright. */
    scheduledDeletionAt: timestamp("scheduled_deletion_at", { withTimezone: true }),
  },
  (t) => [
    index("clients_user_idx").on(t.userId),
    index("clients_status_idx").on(t.status),
  ]
);

/**
 * Intake / initial assessment answers.
 *
 * Stored as JSON and versioned because the question set will change, and a
 * record must stay readable as the answers that were actually given, against
 * the questions that were actually asked.
 */
export const intakeSubmissions = pgTable(
  "intake_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    /** Version of the question set used, e.g. "intake-v1". */
    formVersion: text("form_version").notNull(),
    answers: jsonb("answers").notNull(),
    /** Free-text summary the client gives of what they want help with. */
    presentingConcern: text("presenting_concern"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("intake_client_idx").on(t.clientId)]
);

export const consentType = pgEnum("consent_type", [
  "age_18_plus",
  "terms",
  "privacy",
  "confidentiality_limits",
  "consent_to_support",
  "marketing",
]);

/**
 * Consent records.
 *
 * Each row pins the consent to the *version* of the policy that was on screen
 * at the time, so "what did they actually agree to?" has an answer. Consent is
 * withdrawable: `withdrawnAt` is set rather than the row being deleted.
 */
export const consents = pgTable(
  "consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    type: consentType("type").notNull(),
    /** Slug of the policy shown, matching `policies` in src/data/policies.ts. */
    policySlug: text("policy_slug"),
    /** Version string of that policy, e.g. "1.0.0". */
    policyVersion: text("policy_version"),
    granted: boolean("granted").notNull().default(true),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    /** Evidence of the act of consenting. */
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (t) => [
    index("consents_client_idx").on(t.clientId),
    index("consents_type_idx").on(t.type),
  ]
);

export const documentCategory = pgEnum("document_category", [
  "intake",
  "consent",
  "correspondence",
  "resource",
  "safeguarding",
  "other",
]);

/**
 * Client documents.
 *
 * Only a reference is stored; the bytes live in private Blob storage and are
 * served through an authenticated route that writes an audit entry. Nothing
 * here is publicly addressable.
 */
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    category: documentCategory("category").notNull().default("other"),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: text("size_bytes"),
    /** Private blob pathname — never rendered directly to a browser. */
    blobPath: text("blob_path").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    /** Whether the client can see it in their own portal. */
    visibleToClient: boolean("visible_to_client").notNull().default(false),
  },
  (t) => [index("documents_client_idx").on(t.clientId)]
);

/**
 * Public enquiries from the website contact form.
 *
 * Separate from `clients` because an enquirer has not consented to anything
 * yet, and most never become clients.
 */
export const enquiryStatus = pgEnum("enquiry_status", [
  "new",
  "responded",
  "converted",
  "signposted",
  "closed",
]);

export const enquiries = pgTable(
  "enquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    serviceInterest: text("service_interest"),
    message: text("message"),
    preferredTimes: text("preferred_times"),
    status: enquiryStatus("status").notNull().default("new"),
    handledBy: uuid("handled_by").references(() => users.id, { onDelete: "set null" }),
    handledAt: timestamp("handled_at", { withTimezone: true }),
    internalNotes: text("internal_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("enquiries_status_idx").on(t.status)]
);

/**
 * In-portal messaging.
 *
 * Exists so that nothing personal ever has to travel by ordinary email, which
 * the brief explicitly rules out. Email is only ever used to say "you have a
 * new message, sign in to read it".
 */
export const secureMessages = pgTable(
  "secure_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [index("secure_messages_client_idx").on(t.clientId)]
);
