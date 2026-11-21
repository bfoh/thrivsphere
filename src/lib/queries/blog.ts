import "server-only";

import { and, asc, count, desc, eq, inArray, isNotNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import { blogComments, blogLikes, blogPostVersions, blogPosts, blogReviews, users } from "@/db/schema";
import { readingTime, type BlogContent, type BlogStatus } from "@/lib/blog-rules";

/**
 * Reading the blog.
 *
 * The website only ever reads a post's *published* version, so nothing a
 * colleague is still writing or a reviewer hasn't approved can reach it.
 */

export type PublicPost = BlogContent & {
  id: string;
  slug: string;
  firstPublishedAt: Date;
  publishedAt: Date;
  readTime: string;
  authorName: string;
  reviewerName: string | null;
};

const TEAM = "ThriveSphere team";

export function toContent(v: typeof blogPostVersions.$inferSelect): BlogContent {
  return {
    title: v.title,
    category: v.category,
    excerpt: v.excerpt,
    metaDescription: v.metaDescription,
    body: v.body,
    sources: v.sources ?? [],
    coverImage: v.coverImage,
    coverAlt: v.coverAlt,
  };
}

/** Published posts, newest first, for the blog page, the sitemap and the feed. */
export async function getPublishedPosts(limit = 200) {
  const author = alias(users, "author");
  const rows = await getDb()
    .select({
      slug: blogPosts.slug,
      firstPublishedAt: blogPosts.firstPublishedAt,
      publishedAt: blogPosts.publishedAt,
      title: blogPostVersions.title,
      category: blogPostVersions.category,
      excerpt: blogPostVersions.excerpt,
      body: blogPostVersions.body,
      coverImage: blogPostVersions.coverImage,
      coverAlt: blogPostVersions.coverAlt,
      authorName: author.displayName,
    })
    .from(blogPosts)
    .innerJoin(blogPostVersions, eq(blogPostVersions.id, blogPosts.publishedVersionId))
    .leftJoin(author, eq(author.id, blogPosts.authorId))
    .where(isNotNull(blogPosts.publishedVersionId))
    .orderBy(desc(blogPosts.firstPublishedAt))
    .limit(limit);

  return rows.map(({ body, ...r }) => ({
    ...r,
    firstPublishedAt: r.firstPublishedAt ?? r.publishedAt ?? new Date(),
    publishedAt: r.publishedAt ?? r.firstPublishedAt ?? new Date(),
    readTime: readingTime(body),
    authorName: r.authorName || TEAM,
  }));
}

/** One published post by its address, with who wrote and who reviewed it. */
export async function getPublishedPost(slug: string): Promise<PublicPost | null> {
  const db = getDb();
  const author = alias(users, "author");
  const [row] = await db
    .select({ post: blogPosts, version: blogPostVersions, authorName: author.displayName })
    .from(blogPosts)
    .innerJoin(blogPostVersions, eq(blogPostVersions.id, blogPosts.publishedVersionId))
    .leftJoin(author, eq(author.id, blogPosts.authorId))
    .where(eq(blogPosts.slug, slug))
    .limit(1);
  if (!row) return null;

  const [review] = await db
    .select({ name: users.displayName })
    .from(blogReviews)
    .innerJoin(users, eq(users.id, blogReviews.reviewerId))
    .where(and(eq(blogReviews.versionId, row.version.id), eq(blogReviews.decision, "approved")))
    .orderBy(desc(blogReviews.createdAt))
    .limit(1);

  const published = row.post.publishedAt ?? row.post.firstPublishedAt ?? row.version.createdAt;
  return {
    ...toContent(row.version),
    id: row.post.id,
    slug: row.post.slug,
    firstPublishedAt: row.post.firstPublishedAt ?? published,
    publishedAt: published,
    readTime: readingTime(row.version.body),
    authorName: row.authorName || TEAM,
    reviewerName: review?.name ?? null,
  };
}

/** Whether a cover photo belongs to a published version, so the public route may serve it. */
export async function isPublishedCover(name: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .innerJoin(blogPostVersions, eq(blogPostVersions.id, blogPosts.publishedVersionId))
    .where(eq(blogPostVersions.coverImage, name))
    .limit(1);
  return !!row;
}

// ---------------------------------------------------------------------------
// Back office

export async function listPostsForAdmin(statuses?: BlogStatus[]) {
  const author = alias(users, "author");
  return getDb()
    .select({
      id: blogPosts.id,
      slug: blogPosts.slug,
      status: blogPosts.status,
      publishedVersionId: blogPosts.publishedVersionId,
      scheduledFor: blogPosts.scheduledFor,
      updatedAt: blogPosts.updatedAt,
      firstPublishedAt: blogPosts.firstPublishedAt,
      title: blogPostVersions.title,
      category: blogPostVersions.category,
      authorName: author.displayName,
      authorEmail: author.email,
    })
    .from(blogPosts)
    .leftJoin(blogPostVersions, eq(blogPostVersions.id, blogPosts.currentVersionId))
    .leftJoin(author, eq(author.id, blogPosts.authorId))
    .where(statuses?.length ? inArray(blogPosts.status, statuses) : undefined)
    .orderBy(desc(blogPosts.updatedAt))
    .limit(300);
}

/** Everything the editor page shows. */
export async function getPostForEditor(id: string) {
  const db = getDb();
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  if (!post) return null;

  const maker = alias(users, "maker");
  const peopleIds = [post.authorId, post.submittedBy, post.createdBy].filter((v): v is string => !!v);
  const [versions, reviews, people] = await Promise.all([
    db
      .select({ version: blogPostVersions, makerName: maker.displayName, makerEmail: maker.email })
      .from(blogPostVersions)
      .leftJoin(maker, eq(maker.id, blogPostVersions.createdBy))
      .where(eq(blogPostVersions.postId, id))
      .orderBy(desc(blogPostVersions.number)),
    db
      .select({
        id: blogReviews.id,
        versionId: blogReviews.versionId,
        decision: blogReviews.decision,
        comment: blogReviews.comment,
        createdAt: blogReviews.createdAt,
        reviewerId: blogReviews.reviewerId,
        reviewerName: users.displayName,
        reviewerEmail: users.email,
      })
      .from(blogReviews)
      .innerJoin(users, eq(users.id, blogReviews.reviewerId))
      .where(eq(blogReviews.postId, id))
      .orderBy(desc(blogReviews.createdAt)),
    peopleIds.length
      ? db.select({ id: users.id, name: users.displayName, email: users.email }).from(users).where(inArray(users.id, peopleIds))
      : Promise.resolve([] as { id: string; name: string | null; email: string }[]),
  ]);

  const byId = new Map(versions.map((v) => [v.version.id, v]));
  const current = post.currentVersionId ? byId.get(post.currentVersionId) ?? null : null;
  const published = post.publishedVersionId ? byId.get(post.publishedVersionId) ?? null : null;
  // What the reviewer compares against: the last version anyone reviewed, or what's live.
  const lastReviewed = reviews.find((r) => r.versionId !== post.currentVersionId);
  const baseline = (lastReviewed && byId.get(lastReviewed.versionId)) || (published && published !== current ? published : null);
  const name = (uid: string | null) => {
    const p = people.find((x) => x.id === uid);
    return p ? p.name || p.email : null;
  };

  return {
    post,
    current,
    published,
    baseline: baseline ?? null,
    versions,
    reviews,
    currentReviewed: reviews.some((r) => r.versionId === post.currentVersionId && r.decision === "approved"),
    authorName: name(post.authorId),
    submittedByName: name(post.submittedBy),
  };
}

/** Everyone who may approve posts: the founder and the colleagues she has named. */
export async function getBlogReviewers() {
  return getDb()
    .select({ id: users.id, email: users.email, name: users.displayName, role: users.role })
    .from(users)
    .where(and(eq(users.status, "active"), or(eq(users.role, "founder"), and(eq(users.blogReviewer, true), inArray(users.role, ["practitioner", "supervisor", "admin"])))))
    .orderBy(asc(users.createdAt));
}

export async function isBlogReviewer(userId: string): Promise<boolean> {
  const [row] = await getDb().select({ flag: users.blogReviewer }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.flag ?? false;
}

/** Taken slugs, for making a new one unique. */
export async function slugsLike(base: string): Promise<string[]> {
  const rows = await getDb().select({ slug: blogPosts.slug }).from(blogPosts);
  return rows.map((r) => r.slug).filter((s) => s === base || s.startsWith(`${base}-`));
}

// ---------------------------------------------------------------------------
// Readers' likes and comments

/** A published post's id from its address, or null: likes and comments are for live posts only. */
export async function publishedPostId(slug: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), isNotNull(blogPosts.publishedVersionId)))
    .limit(1);
  return row?.id ?? null;
}

/** Approved comments, oldest first. Never the email. */
export async function getApprovedComments(postId: string) {
  return getDb()
    .select({ id: blogComments.id, name: blogComments.authorName, body: blogComments.body, createdAt: blogComments.createdAt })
    .from(blogComments)
    .where(and(eq(blogComments.postId, postId), eq(blogComments.status, "approved")))
    .orderBy(asc(blogComments.createdAt))
    .limit(500);
}

export async function likeCount(postId: string): Promise<number> {
  const [row] = await getDb().select({ n: count() }).from(blogLikes).where(eq(blogLikes.postId, postId));
  return row?.n ?? 0;
}

/** Comments for moderators: waiting ones (those that need attention first), then recent decisions. */
export async function getCommentQueue() {
  const db = getDb();
  const moderator = alias(users, "moderator");
  const cols = {
    id: blogComments.id,
    postId: blogComments.postId,
    slug: blogPosts.slug,
    live: blogPosts.publishedVersionId,
    title: blogPostVersions.title,
    name: blogComments.authorName,
    emailEnc: blogComments.emailEnc,
    body: blogComments.body,
    status: blogComments.status,
    needsAttention: blogComments.needsAttention,
    flags: blogComments.flags,
    createdAt: blogComments.createdAt,
    moderatedAt: blogComments.moderatedAt,
    moderatorName: moderator.displayName,
    moderatorEmail: moderator.email,
  };
  const base = () =>
    db
      .select(cols)
      .from(blogComments)
      .innerJoin(blogPosts, eq(blogPosts.id, blogComments.postId))
      .leftJoin(blogPostVersions, eq(blogPostVersions.id, blogPosts.currentVersionId))
      .leftJoin(moderator, eq(moderator.id, blogComments.moderatedBy));
  const [waiting, decided] = await Promise.all([
    base().where(eq(blogComments.status, "pending")).orderBy(desc(blogComments.needsAttention), asc(blogComments.createdAt)).limit(200),
    base().where(inArray(blogComments.status, ["approved", "hidden"])).orderBy(desc(blogComments.moderatedAt)).limit(50),
  ]);
  return { waiting, decided };
}

export async function pendingCommentCount(): Promise<{ total: number; urgent: number }> {
  const rows = await getDb()
    .select({ needsAttention: blogComments.needsAttention, n: count() })
    .from(blogComments)
    .where(eq(blogComments.status, "pending"))
    .groupBy(blogComments.needsAttention);
  return {
    total: rows.reduce((a, r) => a + r.n, 0),
    urgent: rows.find((r) => r.needsAttention)?.n ?? 0,
  };
}

/** Likes and comments on one post, for its editor page. */
export async function postEngagement(postId: string) {
  const db = getDb();
  const [[likes], comments] = await Promise.all([
    db.select({ n: count() }).from(blogLikes).where(eq(blogLikes.postId, postId)),
    db.select({ status: blogComments.status, n: count() }).from(blogComments).where(eq(blogComments.postId, postId)).groupBy(blogComments.status),
  ]);
  const by = (s: string) => comments.find((c) => c.status === s)?.n ?? 0;
  return { likes: likes?.n ?? 0, approved: by("approved"), pending: by("pending") };
}
