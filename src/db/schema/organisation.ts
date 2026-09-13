import {
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

/**
 * Running the organisation: staff records, absence, training, and expenses.
 *
 * Two boundaries are deliberate and should stay.
 *
 * **This is a register, not a payroll system.** No salary, no bank details, no
 * national insurance numbers. What is here is what a wellbeing service is
 * actually asked to evidence — DBS status, supervision, training — plus enough
 * absence tracking to run a rota. Salary data would raise the stakes of a
 * breach considerably for no operational gain, since payroll is done elsewhere.
 *
 * **The ledger feeds an accountant; it does not replace one.** Expenses are
 * recorded so they can be exported, categorised and handed over. Nothing here
 * is statutory bookkeeping and the page says so.
 */

export const contractType = pgEnum("contract_type", [
  "employee",
  "self_employed",
  "volunteer",
  "sessional",
  "director",
]);

/**
 * The employment side of a staff account.
 *
 * Separate from `users` because the two have different lifetimes and very
 * different sensitivity: a user row governs access and is read on every
 * request, while this is read by a founder occasionally. Keeping DBS numbers
 * out of the row loaded on every page view is worth one join.
 */
export const staffProfiles = pgTable(
  "staff_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    jobTitle: text("job_title"),
    contract: contractType("contract").notNull().default("self_employed"),
    startedOn: date("started_on"),
    endedOn: date("ended_on"),

    /**
     * Safeguarding evidence, not administrative trivia. An inspector, an
     * insurer or a commissioning partner will ask for these, and "we think it
     * was done" is not an answer.
     */
    dbsNumber: text("dbs_number"),
    dbsCheckedOn: date("dbs_checked_on"),
    /** Prompt for the next check; DBS certificates carry no expiry of their own. */
    dbsReviewDue: date("dbs_review_due"),

    /** Clinical-style supervision is not required here, but reflective practice is expected. */
    supervisionDue: date("supervision_due"),
    supervisorName: text("supervisor_name"),

    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("staff_profiles_user_idx").on(t.userId)]
);

export const absenceType = pgEnum("absence_type", [
  "annual_leave",
  "sick",
  "training",
  "parental",
  "compassionate",
  "unpaid",
  "other",
]);

/** Dates are inclusive on both ends: a single day is the same date twice. */
export const absences = pgTable(
  "absences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: absenceType("type").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    notes: text("notes"),
    recordedBy: uuid("recorded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("absences_user_idx").on(t.userId), index("absences_start_idx").on(t.startsOn)]
);

/**
 * Training completed, with an expiry where the certificate has one.
 *
 * Safeguarding and first aid lapse; a register that cannot say when is a
 * register that will be out of date without anyone noticing.
 */
export const trainingRecords = pgTable(
  "training_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    course: text("course").notNull(),
    provider: text("provider"),
    completedOn: date("completed_on").notNull(),
    expiresOn: date("expires_on"),
    certificateRef: text("certificate_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("training_user_idx").on(t.userId),
    index("training_expiry_idx").on(t.expiresOn),
  ]
);

export const expenseCategory = pgEnum("expense_category", [
  "software",
  "insurance",
  "supervision",
  "training",
  "marketing",
  "professional_fees",
  "equipment",
  "premises",
  "travel",
  "bank_charges",
  "other",
]);

/**
 * Money out.
 *
 * Pence as an integer, matching `orders` — the two are subtracted from each
 * other, and a ledger where one side is a float and the other is not will
 * eventually disagree with itself by a penny and nobody will know which side
 * is wrong.
 *
 * Receipts live in private Blob storage; only the path is held here.
 */
export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    incurredOn: date("incurred_on").notNull(),
    category: expenseCategory("category").notNull().default("other"),
    description: text("description").notNull(),
    supplier: text("supplier"),
    amountPence: integer("amount_pence").notNull(),
    /** Recoverable VAT, where there is any. Zero for a service not VAT-registered. */
    vatPence: integer("vat_pence").notNull().default(0),
    receiptPath: text("receipt_path"),
    notes: text("notes"),
    recordedBy: uuid("recorded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("expenses_date_idx").on(t.incurredOn),
    index("expenses_category_idx").on(t.category),
  ]
);
