import {
  boolean,
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./identity";

/** Emergency Contact / Next of Kin (IT handover §15.2): the client's answer. */
export const emergencyContactStatus = pgEnum("emergency_contact_status", ["provided", "unable", "prefer_not"]);
export const emergencyContactMethod = pgEnum("emergency_contact_method", ["phone", "email", "other"]);

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
     * ThriveSphere is an adults-only service and under-18s must stay blocked
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

    /**
     * Emergency Contact / Next of Kin (IT handover §15.2–15.4). Kept for serious
     * safety concerns only, never marketing or routine updates. Seen only by
     * the Safeguarding Lead, the Deputy and the client's own practitioners.
     * Status is null until the client has answered; "unable" and "prefer_not"
     * record a client who gave no contact, which never blocks them.
     */
    emergencyContactStatus: emergencyContactStatus("emergency_contact_status"),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactRelationship: text("emergency_contact_relationship"),
    /** With the international dialling code. */
    emergencyContactPhone: text("emergency_contact_phone"),
    /** Alternative phone or email. */
    emergencyContactAlt: text("emergency_contact_alt"),
    emergencyContactCountry: text("emergency_contact_country"),
    emergencyContactTimeZone: text("emergency_contact_time_zone"),
    emergencyContactMethod: emergencyContactMethod("emergency_contact_method"),
    emergencyContactMethodOther: text("emergency_contact_method_other"),
    /** "I have informed this person, where practicable, …" */
    emergencyContactInformed: boolean("emergency_contact_informed"),
    emergencyContactUpdatedAt: timestamp("emergency_contact_updated_at", { withTimezone: true }),
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
    // One client record per sign-in (IT handover §19: "a single client
    // profile"). A double-submitted registration form cannot make two.
    uniqueIndex("clients_user_unique").on(t.userId),
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
  // The booking terms and 72-hour cancellation policy, accepted before paying
  // for a booking (IT handover §15.1, §19). Separate from consent to support.
  "booking_terms",
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
 * Public enquiries: the contact form and callback requests.
 *
 * Separate from `clients` because an enquirer has not consented to anything
 * yet, and many never become clients. Every submission is stored, given a
 * reference, and worked as a queue (IT handover §16.4, §19 Route B).
 *
 * `responded`, `converted` and `signposted` predate the handover's statuses
 * and are kept because Postgres cannot drop an enum value; the queue offers
 * New, In progress, Awaiting client, Responded and Closed.
 */
export const enquiryStatus = pgEnum("enquiry_status", [
  "new",
  "responded",
  "converted",
  "signposted",
  "closed",
  "in_progress",
  "awaiting_client",
]);

/** The categories of IT handover §16.2, plus a callback request (§19 Route B). */
export const enquiryCategory = pgEnum("enquiry_category", [
  "individual",
  "corporate",
  "general",
  "existing_client",
  "other",
  "callback",
]);

export const enquiries = pgTable(
  "enquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Quoted to the enquirer, e.g. TS-7K2Q9M. Never the database id. */
    reference: text("reference").notNull().unique(),
    category: enquiryCategory("category").notNull().default("general"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    country: text("country"),
    /** How they would like to be contacted: email, phone, either. */
    preferredContact: text("preferred_contact"),
    subject: text("subject"),
    serviceInterest: text("service_interest"),
    message: text("message"),
    preferredTimes: text("preferred_times"),
    /** Callback requests are for adults only and confirm it on the form. */
    confirmedAdult: boolean("confirmed_adult").notNull().default(false),
    privacyAcknowledgedAt: timestamp("privacy_acknowledged_at", { withTimezone: true }),
    status: enquiryStatus("status").notNull().default("new"),
    /** The client record this enquiry belongs to, matched on email. */
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    /** Who owns it now. */
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    handledBy: uuid("handled_by").references(() => users.id, { onDelete: "set null" }),
    handledAt: timestamp("handled_at", { withTimezone: true }),
    internalNotes: text("internal_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("enquiries_status_idx").on(t.status),
    index("enquiries_email_idx").on(t.email),
    index("enquiries_created_idx").on(t.createdAt),
  ]
);

export const enquiryEventKind = pgEnum("enquiry_event_kind", [
  "received",
  "status",
  "assigned",
  "note",
  "contact",
  "booking_link",
  "linked",
]);

/**
 * What happened to an enquiry, and who did it: the contact history the
 * handover asks for (§16.4, §19). Rows are only ever added.
 */
export const enquiryEvents = pgTable(
  "enquiry_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enquiryId: uuid("enquiry_id")
      .notNull()
      .references(() => enquiries.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    kind: enquiryEventKind("kind").notNull(),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("enquiry_events_enquiry_idx").on(t.enquiryId, t.createdAt)]
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
