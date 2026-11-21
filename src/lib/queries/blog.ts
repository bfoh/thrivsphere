import "server-only";

import { and, asc, desc, eq, inArray, isNotNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import { blogPostVersions, blogPosts, blogReviews, users } from "@/db/schema";
import { readingTime, type BlogContent, type BlogStatus } from "@/lib/blog-rules";

/**
 * Reading the blog.
 *
 * The website only ever reads a post's *published* version, so nothing a
 * colleague is still writing or a reviewer hasn't approved can reach it.
 */

export type PublicPost = BlogContent & {
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
