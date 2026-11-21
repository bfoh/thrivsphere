import "server-only";

import { revalidatePath } from "next/cache";
import { and, desc, eq, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { blogPostVersions, blogPosts, blogReviews } from "@/db/schema";
import { contentHash } from "@/lib/blog-hash";
import { canPublish } from "@/lib/blog-rules";
import { toContent } from "@/lib/queries/blog";

/**
 * Putting a post on the website. Shared by "Publish now" and the hourly job
 * that publishes scheduled posts, so both check the same thing: the version
 * going live is the one a reviewer approved, fingerprint and all.
 */

type Post = typeof blogPosts.$inferSelect;

export async function verifyApproval(post: Post): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!canPublish(post)) return { ok: false, message: "Only an approved post can be published, and it must not have changed since." };
  const db = getDb();
  const [version] = await db.select().from(blogPostVersions).where(eq(blogPostVersions.id, post.approvedVersionId!)).limit(1);
  if (!version) return { ok: false, message: "The approved version is missing." };
  const [approval] = await db
    .select({ hash: blogReviews.contentHash })
    .from(blogReviews)
    .where(and(eq(blogReviews.versionId, version.id), eq(blogReviews.decision, "approved")))
    .orderBy(desc(blogReviews.createdAt))
    .limit(1);
  const hash = contentHash(toContent(version));
  if (!approval || approval.hash !== hash || version.contentHash !== hash) {
    console.error("[blog] approval does not match the version", version.id);
    return { ok: false, message: "This version doesn't match what was approved, so it can't be published. Send it for review again." };
  }
  return { ok: true };
}

export function refreshPublicBlog(slug: string) {
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/blog/rss.xml");
  revalidatePath("/sitemap.xml");
}

/** Publish a post that has passed `verifyApproval`. Only moves a post whose approval hasn't changed meanwhile. */
export async function markPublished(post: Post, now: Date): Promise<boolean> {
  const rows = await getDb()
    .update(blogPosts)
    .set({
      status: "published",
      publishedVersionId: post.approvedVersionId,
      publishedAt: now,
      firstPublishedAt: post.firstPublishedAt ?? now,
      scheduledFor: null,
      updatedAt: now,
    })
    .where(and(eq(blogPosts.id, post.id), eq(blogPosts.approvedVersionId, post.approvedVersionId!), eq(blogPosts.currentVersionId, post.approvedVersionId!)))
    .returning({ id: blogPosts.id });
  if (rows.length) refreshPublicBlog(post.slug);
  return rows.length > 0;
}

/** The hourly job: publish scheduled posts whose time has come. */
export async function publishDuePosts(now: Date): Promise<{ published: number; refused: number }> {
  const due = await getDb()
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.status, "scheduled"), lte(blogPosts.scheduledFor, now)));
  let published = 0;
  let refused = 0;
  for (const post of due) {
    const check = await verifyApproval(post);
    if (!check.ok) {
      refused++;
      await getDb().update(blogPosts).set({ status: "approved", scheduledFor: null, updatedAt: now }).where(eq(blogPosts.id, post.id));
      continue;
    }
    if (await markPublished(post, now)) published++;
  }
  return { published, refused };
}
