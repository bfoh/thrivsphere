"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { blogComments, blogPosts } from "@/db/schema";
import { brand } from "@/data/site";
import { requireCapability } from "@/lib/guard";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz";
import { encryptSecret } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { blogCommentNotice } from "@/lib/email-templates";
import { commentFlags, parseComment, thankYou } from "@/lib/blog-comment-rules";
import { publishedPostId } from "@/lib/queries/blog";
import { rateLimited } from "@/lib/rate-limit";
import type { CommentFormState } from "@/lib/blog-comment-state";
import type { BlogFormState } from "@/lib/blog-state";

/**
 * Readers' comments on blog posts.
 *
 * Anyone may comment with a name and an email address; the email is stored
 * encrypted and never shown. Every comment waits for a member of staff to
 * approve it (owner's decision, 21 November 2026). One that suggests the
 * writer may be at risk is put first and staff are emailed straight away,
 * with a link only.
 */

function str(fd: FormData, name: string) {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

export async function submitBlogComment(_prev: CommentFormState, fd: FormData): Promise<CommentFormState> {
  const values = { name: str(fd, "name").slice(0, 100), email: str(fd, "email").slice(0, 200), body: str(fd, "body").slice(0, 4000) };
  // Honeypot: real people leave this hidden field empty.
  if (str(fd, "company")) return { status: "ok", message: thankYou(false) };

  const parsed = parseComment({ ...values, agreed: fd.get("agreed") === "on" });
  if (!parsed.ok) return { status: "error", message: "Please check the highlighted fields.", errors: parsed.errors, values };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(`comment:${ip}`, 5, 10 * 60_000)) {
    return { status: "error", message: "Too many comments from this connection. Please try again later.", values };
  }

  const postId = await publishedPostId(str(fd, "slug"));
  if (!postId) return { status: "error", message: "This post isn't taking comments.", values };

  const { flags, needsAttention } = commentFlags(parsed.value.body);
  try {
    await getDb().insert(blogComments).values({
      postId,
      authorName: parsed.value.name,
      emailEnc: encryptSecret(parsed.value.email),
      body: parsed.value.body,
      needsAttention,
      flags,
    });
  } catch (err) {
    console.error("[blog] comment not saved", err);
    return { status: "error", message: "We couldn't save your comment just now. Please try again.", values };
  }

  try {
    const email = blogCommentNotice({ needsAttention });
    const r = await sendEmail({ to: process.env.ENQUIRY_TO_EMAIL ?? brand.email, subject: email.subject, text: email.text, html: email.html });
    if (!r.ok) console.error("[blog] comment notice not sent", r.reason);
  } catch (err) {
    console.error("[blog] comment notice failed", err);
  }

  revalidatePath("/admin/blog/comments");
  return { status: "ok", message: thankYou(needsAttention) };
}

/**
 * Approve, hide or delete a comment. Any member of staff who writes posts
 * (owner's decision, 21 November 2026). Deleting removes it and the email
 * for good, for someone who asks for their comment to be removed.
 */
export async function moderateComment(_prev: BlogFormState, fd: FormData): Promise<BlogFormState> {
  const id = str(fd, "commentId");
  const decision = str(fd, "decision");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["approve", "hide", "delete"].includes(decision)) {
    return { status: "error", message: "Choose what to do with the comment." };
  }

  let actor;
  try {
    actor = await requireCapability("blog:write", {
      entity: "blog_comments",
      entityId: id,
      action: decision === "delete" ? "delete" : "update",
      detail: `${decision === "approve" ? "approved" : decision === "hide" ? "hid" : "deleted"} a blog comment`,
    });
  } catch (err) {
    if (err instanceof UnauthenticatedError) return { status: "error", message: "Your session has expired. Please sign in again." };
    if (err instanceof ForbiddenError) return { status: "error", message: err.message };
    throw err;
  }

  const db = getDb();
  const [row] = await db
    .select({ id: blogComments.id, status: blogComments.status, slug: blogPosts.slug })
    .from(blogComments)
    .innerJoin(blogPosts, eq(blogPosts.id, blogComments.postId))
    .where(eq(blogComments.id, id))
    .limit(1);
  if (!row) return { status: "error", message: "That comment no longer exists." };

  if (decision === "delete") {
    await db.delete(blogComments).where(eq(blogComments.id, id));
  } else {
    await db
      .update(blogComments)
      .set({ status: decision === "approve" ? "approved" : "hidden", moderatedBy: actor.userId, moderatedAt: new Date() })
      .where(eq(blogComments.id, id));
  }

  revalidatePath("/admin/blog/comments");
  revalidatePath(`/blog/${row.slug}`);
  return {
    status: "ok",
    message: decision === "approve" ? "Approved. It's on the post now." : decision === "hide" ? "Hidden. It isn't on the website." : "Deleted, with the email address.",
  };
}
