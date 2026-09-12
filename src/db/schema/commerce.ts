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
import { clients } from "./clients";

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
    description: text("description").notNull(),
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
 * provider, so PCI scope stays outside ThrivSphere. Only identifiers and
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
    amountPence: integer("amount_pence").notNull(),
    currency: text("currency").notNull().default("GBP"),
    status: orderStatus("status").notNull().default("pending"),

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
  ]
);
