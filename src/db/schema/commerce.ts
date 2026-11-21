import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { clients } from "./clients";
import { users } from "./identity";

/**
 * Delivery formats.
 *
 * Only `one_to_one` is sold at launch. Group, webinar and course exist now so
 * that adding them later (brief §8) is a row, not a schema change.
 */
export const serviceKind = pgEnum("service_kind", [
  "one_to_one",
  "group",
  "webinar",
  "course",
]);

/**
 * Services, editable from the admin dashboard.
 *
 * The brief requires the client to be able to change services and prices
 * without a developer, so this is data rather than the hardcoded array in
 * src/data/site.ts. That array becomes the seed for this table.
 */
export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    /** One line for the homepage card. */
    summary: text("summary"),
    description: text("description").notNull(),
    /** The bullet list beneath the description on /services. */
    points: jsonb("points").$type<string[]>().notNull().default([]),
    /** A boundary or clarification shown beneath the points. */
    note: text("note"),
    kind: serviceKind("kind").notNull().default("one_to_one"),
    /** Default appointment length used when booking this service. */
    durationMinutes: integer("duration_minutes").notNull().default(50),
    /** Inactive services stay bookable for existing packages but are hidden. */
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("services_active_idx").on(t.active)]
);

/**
 * Price plans, also admin-editable.
 *
 * Money is stored in pence as an integer — never a float — because this is the
 * amount handed to Stripe and reconciled against payouts.
 */
export const pricePlans = pgTable(
  "price_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    blurb: text("blurb"),
    amountPence: integer("amount_pence").notNull(),
    currency: text("currency").notNull().default("GBP"),
    /** Sessions credited to the client's package when this is paid for. */
    sessions: integer("sessions").notNull().default(1),
    /** How long the credited sessions remain usable. Null means no expiry. */
    validityDays: integer("validity_days"),
    featured: boolean("featured").notNull().default(false),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("price_plans_active_idx").on(t.active)]
);

/**
 * Discounts the founder or an admin gives.
 *
 * - `client`: a concession on one client's record, e.g. 50% off. That client
 *   sees and pays the lower price wherever they buy; at most one is active.
 * - `code`: a code anyone who has it can enter before paying.
 *
 * Either a percentage or an amount off each purchase, never both. The
 * reduced price is worked out on our server and charged to Stripe as is, so
 * the order's amount stays what was actually paid (see `orders`).
 */
export const discountKind = pgEnum("discount_kind", ["client", "code"]);

/** Why a discount was given. Kept to a list: never health details. */
export const discountReason = pgEnum("discount_reason", [
  "financial_hardship",
  "goodwill",
  "partner_referral",
  "other",
]);

export const discounts = pgTable(
  "discounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: discountKind("kind").notNull(),
    /** The client a concession is for. */
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
    /** A code, in capitals. */
    code: text("code").unique(),
    /** What the client sees, e.g. "Concessionary rate". */
    label: text("label").notNull(),
    percentOff: integer("percent_off"),
    amountOffPence: integer("amount_off_pence"),
    /** The price plans it covers; null covers them all. */
    planSlugs: text("plan_slugs").array(),
    /** Purchases it can be used for in total; null is unlimited. */
    maxUses: integer("max_uses"),
    /** For codes: purchases each client may use it for. */
    maxUsesPerClient: integer("max_uses_per_client"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    reason: discountReason("reason"),
    /** Internal note. Never health details. */
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    endedBy: uuid("ended_by").references(() => users.id, { onDelete: "set null" }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [
    index("discounts_client_idx").on(t.clientId),
    // One active concession per client.
    uniqueIndex("discounts_one_concession")
      .on(t.clientId)
      .where(sql`${t.kind} = 'client' and ${t.active}`),
    check(
      "discounts_one_amount",
      sql`(${t.percentOff} is null) <> (${t.amountOffPence} is null)`
    ),
    check(
      "discounts_kind_target",
      sql`(${t.kind} = 'client' and ${t.clientId} is not null and ${t.code} is null) or (${t.kind} = 'code' and ${t.code} is not null and ${t.clientId} is null)`
    ),
  ]
);

export const orderStatus = pgEnum("order_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
  "cancelled",
]);

/**
 * A payment attempt.
 *
 * Card details never reach this application — checkout is hosted by the payment
 * provider, so PCI scope stays outside ThriveSphere. Only identifiers and
 * amounts are recorded here.
 */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    pricePlanId: uuid("price_plan_id").references(() => pricePlans.id, {
      onDelete: "set null",
    }),
    /** Snapshot of what was bought, so history survives a plan being edited. */
    planNameAtPurchase: text("plan_name_at_purchase").notNull(),
    /** What was actually charged (after any discount): what refunds and revenue use. */
    amountPence: integer("amount_pence").notNull(),
    currency: text("currency").notNull().default("GBP"),
    status: orderStatus("status").notNull().default("pending"),
    /** The full price before any discount. Null on orders from before discounts. */
    listPricePence: integer("list_price_pence"),
    discountId: uuid("discount_id").references(() => discounts.id, { onDelete: "set null" }),
    discountPence: integer("discount_pence").notNull().default(0),
    /** The discount's label when it was used, so history survives it changing. */
    discountLabel: text("discount_label"),
    /** Free sessions given by ThriveSphere: no payment, nothing at Stripe. */
    complimentary: boolean("complimentary").notNull().default(false),

    checkoutSessionId: text("checkout_session_id").unique(),
    paymentIntentId: text("payment_intent_id"),
    /**
     * Idempotency guard. Payment providers retry webhooks, and a replayed
     * event must not credit a package twice.
     */
    processedEventId: text("processed_event_id").unique(),

    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    refundReason: text("refund_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("orders_client_idx").on(t.clientId),
    index("orders_status_idx").on(t.status),
    index("orders_discount_idx").on(t.discountId),
  ]
);

export const packageStatus = pgEnum("package_status", [
  "active",
  "exhausted",
  "expired",
  "refunded",
]);

/**
 * A block of prepaid sessions.
 *
 * `sessionsUsed` is incremented when an appointment is completed or recorded as
 * a chargeable no-show, so the client's remaining balance is always derivable
 * from one row rather than by counting appointments.
 */
export const packages = pgTable(
  "packages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    sessionsTotal: integer("sessions_total").notNull(),
    sessionsUsed: integer("sessions_used").notNull().default(0),
    status: packageStatus("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("packages_client_idx").on(t.clientId),
    index("packages_status_idx").on(t.status),
    // One package per payment. A webhook delivered twice, or retried after a
    // crash, can then never credit the same payment twice.
    uniqueIndex("packages_order_unique").on(t.orderId),
  ]
);
