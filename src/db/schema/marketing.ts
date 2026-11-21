import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { BrandKit } from "../../lib/brand-kit";
import { enquiries } from "./clients";
import { orders } from "./commerce";
import { users } from "./identity";

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

// ---------------------------------------------------------------------------
// Release 1: the Brand Kit, the photo and graphics library, and AI usage.

/**
 * Each saved version of the Brand Kit. Versions are never changed; editing
 * makes a new one. Only a version the founder has approved is used.
 */
export const brandKitVersions = pgTable(
  "brand_kit_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: integer("number").notNull(),
    content: jsonb("content").$type<BrandKit>().notNull(),
    contentHash: text("content_hash").notNull(),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("brand_kit_versions_number_idx").on(t.number)]
);

/** The founder's approval of one exact version (its fingerprint is kept with it). */
export const brandKitApprovals = pgTable(
  "brand_kit_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => brandKitVersions.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("brand_kit_approvals_version_idx").on(t.versionId)]
);

export const assetSource = pgEnum("asset_source", ["upload", "template", "ai_generated"]);
/** Whose the image is, and so whether it may be used. */
export const assetRights = pgEnum("asset_rights", ["owned", "staff_photo_consented", "licensed", "generated"]);
/** Who is in it. There is deliberately no way to record a client. */
export const assetPeople = pgEnum("asset_people", ["none", "staff_consented"]);

/**
 * Photos and graphics for marketing. Files live in private storage under a
 * generated name and are never overwritten; a changed graphic is a new file.
 */
export const marketingAssets = pgTable(
  "marketing_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blobPath: text("blob_path").notNull(),
    contentType: text("content_type").notNull(),
    width: integer("width"),
    height: integer("height"),
    bytes: integer("bytes").notNull(),
    sha256: text("sha256").notNull(),
    title: text("title").notNull(),
    altText: text("alt_text"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    source: assetSource("source").notNull(),
    rights: assetRights("rights").notNull(),
    rightsNote: text("rights_note"),
    people: assetPeople("people").notNull().default("none"),
    licenceExpires: date("licence_expires"),
    // Graphics made from a template: which one, with what, under which kit.
    templateKey: text("template_key"),
    templateInput: jsonb("template_input").$type<Record<string, unknown>>(),
    kitVersionId: uuid("kit_version_id").references(() => brandKitVersions.id, { onDelete: "set null" }),
    // AI-generated images: the provider, model and prompt, for the record.
    aiProvider: text("ai_provider"),
    aiModel: text("ai_model"),
    aiPrompt: text("ai_prompt"),
    /** Only images used in a sent newsletter are ever served publicly. */
    isPublic: boolean("is_public").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("marketing_assets_blob_path_idx").on(t.blobPath),
    index("marketing_assets_created_idx").on(t.createdAt),
    index("marketing_assets_sha_idx").on(t.sha256),
  ]
);

export const aiOutcome = pgEnum("ai_outcome", ["ok", "refused", "error", "blocked", "over_budget"]);

/**
 * Every AI request: what it was for, who asked, what it cost. Prompts and
 * replies are not stored here.
 */
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    feature: text("feature").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    entity: text("entity"),
    entityId: uuid("entity_id"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    cacheWriteTokens: integer("cache_write_tokens").notNull().default(0),
    images: integer("images").notNull().default(0),
    /** Millionths of a US dollar, so sums stay exact. */
    costMicroUsd: integer("cost_micro_usd").notNull().default(0),
    outcome: aiOutcome("outcome").notNull(),
    requestId: text("request_id"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_usage_created_idx").on(t.createdAt), index("ai_usage_feature_idx").on(t.feature, t.createdAt)]
);
