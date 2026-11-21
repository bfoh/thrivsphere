import { sql } from "drizzle-orm";
import { check, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { enquiries } from "./clients";
import { orders } from "./commerce";

/**
 * Marketing: how people found ThriveSphere, and (later) the brand kit,
 * content and newsletter. See docs/marketing.md.
 */

/** "How did you hear about us?" Keys match HEARD_VIA in src/lib/attribution.ts. */
export const heardVia = pgEnum("heard_via", [
  "search_engine",
  "google_maps",
  "instagram",
  "facebook",
  "linkedin",
  "blog",
  "newsletter",
  "friend_or_family",
  "employer_or_hr",
  "health_professional",
  "event_or_talk",
  "other",
  "prefer_not_to_say",
]);

/**
 * Where an enquiry, callback or paid consultation came from: what the person
 * told us, and the tracking tags on the link they arrived by. Nothing is
 * stored on their device to get this. One row per enquiry or order.
 */
export const leadAttributions = pgTable(
  "lead_attributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enquiryId: uuid("enquiry_id").references(() => enquiries.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
    heardVia: heardVia("heard_via"),
    heardViaDetail: text("heard_via_detail"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmContent: text("utm_content"),
    landingPath: text("landing_path"),
    referrerHost: text("referrer_host"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("lead_attributions_one_subject", sql`num_nonnulls(${t.enquiryId}, ${t.orderId}) = 1`),
    index("lead_attributions_enquiry_idx").on(t.enquiryId),
    index("lead_attributions_order_idx").on(t.orderId),
    index("lead_attributions_campaign_idx").on(t.utmCampaign),
    index("lead_attributions_created_idx").on(t.createdAt),
  ]
);
