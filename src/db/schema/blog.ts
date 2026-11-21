import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  primaryKey,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "./identity";
import type { BlogBrief, BlogSource } from "../../lib/blog-rules";

/**
 * The blog.
 *
 * A post is a slug and a workflow; what readers see lives in its versions,
 * which are only ever added. Three pointers say which version is which: the
 * one being worked on, the one a reviewer approved, and the one on the
 * website. Publishing copies the approved pointer to the published one, so a
 * live post keeps showing exactly what was approved while a new version is
 * written and reviewed.
 */
export const blogStatus = pgEnum("blog_status", [
  "draft",
  "in_review",
  "changes_requested",
  "approved",
  "scheduled",
  "published",
  "archived",
]);

/** Where a version came from, for the record. Never shown on the website. */
export const blogVersionOrigin = pgEnum("blog_version_origin", ["imported", "human_edit", "ai_draft", "ai_assist"]);

export const blogReviewDecision = pgEnum("blog_review_decision", ["approved", "changes_requested"]);

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    status: blogStatus("status").notNull().default("draft"),
    /** Shown in the byline. Null reads "ThriveSphere team". */
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    brief: jsonb("brief").$type<BlogBrief>(),
    currentVersionId: uuid("current_version_id").references((): AnyPgColumn => blogPostVersions.id),
    approvedVersionId: uuid("approved_version_id").references((): AnyPgColumn => blogPostVersions.id),
    publishedVersionId: uuid("published_version_id").references((): AnyPgColumn => blogPostVersions.id),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    /** The date readers see. Set once, the first time the post goes live. */
    firstPublishedAt: timestamp("first_published_at", { withTimezone: true }),
    /** When the version now live went live. */
    publishedAt: timestamp("published_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submittedBy: uuid("submitted_by").references(() => users.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("blog_posts_status_idx").on(t.status),
    index("blog_posts_published_idx").on(t.publishedVersionId),
  ]
);

export const blogPostVersions = pgTable(
  "blog_post_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    metaDescription: text("meta_description"),
    /** Markdown. Rendered without raw HTML. */
    body: text("body").notNull().default(""),
    sources: jsonb("sources").$type<BlogSource[]>().notNull().default([]),
    /** Name of the cover photo in storage, e.g. `<uuid>.jpg`. */
    coverImage: text("cover_image"),
    coverAlt: text("cover_alt"),
    contentHash: text("content_hash").notNull(),
    origin: blogVersionOrigin("origin").notNull(),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("blog_post_versions_number").on(t.postId, t.number)]
);

/** Each decision on a version, kept for the record. */
export const blogReviews = pgTable(
  "blog_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    versionId: uuid("version_id")
      .notNull()
      .references(() => blogPostVersions.id),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.id),
    decision: blogReviewDecision("decision").notNull(),
    comment: text("comment"),
    /** What the reviewer confirmed, e.g. `{ read: true, facts: true, … }`. */
    checklist: jsonb("checklist").$type<Record<string, boolean>>().notNull().default({}),
    /** The version's fingerprint when it was approved. */
    contentHash: text("content_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("blog_reviews_post_idx").on(t.postId), index("blog_reviews_version_idx").on(t.versionId)]
);

/**
 * Readers' comments. Held until a member of staff approves them, because a
 * reader may be struggling and a comment can carry a crisis disclosure or
 * someone's personal details (owner's decision, 21 November 2026).
 */
export const blogCommentStatus = pgEnum("blog_comment_status", ["pending", "approved", "hidden"]);

export const blogComments = pgTable(
  "blog_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    /** Shown with the comment. */
    authorName: text("author_name").notNull(),
    /** Encrypted. Never shown; staff use it to follow up if they need to. */
    emailEnc: text("email_enc").notNull(),
    body: text("body").notNull(),
    status: blogCommentStatus("status").notNull().default("pending"),
    /** Something in it suggests the writer may be at risk: shown first, and staff are told. */
    needsAttention: boolean("needs_attention").notNull().default(false),
    /** What the automatic check noticed, for the moderator. */
    flags: text("flags").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    moderatedBy: uuid("moderated_by").references(() => users.id, { onDelete: "set null" }),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
  },
  (t) => [
    index("blog_comments_post_idx").on(t.postId, t.status),
    index("blog_comments_queue_idx").on(t.status, t.createdAt),
  ]
);

/**
 * Likes, one per browser per post. The browser holds a random id in a cookie
 * set only when someone presses Like; only a hash of it is stored here.
 */
export const blogLikes = pgTable(
  "blog_likes",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    readerHash: text("reader_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.readerHash] })]
);
