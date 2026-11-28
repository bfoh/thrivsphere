"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { blogPostVersions, blogPosts, blogReviews, users } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { ForbiddenError, UnauthenticatedError, type Actor } from "@/lib/authz";
import { sendEmail } from "@/lib/email";
import { blogReviewDecision, blogReviewRequest } from "@/lib/email-templates";
import { contentHash } from "@/lib/blog-hash";
import {
  LIMITS,
  REVIEW_CHECKS,
  STATUS_LABEL,
  afterEdit,
  approvalStands,
  awaitingDecision,
  canArchive,
  canRestore,
  canReview,
  canSchedule,
  canSubmit,
  canUnpublish,
  canWithdraw,
  checklistComplete,
  isValidSlug,
  parseBrief,
  parseContent,
  reviewProblems,
  scheduleProblem,
  slugify,
  uniqueSlug,
} from "@/lib/blog-rules";
import { getBlogReviewers, isBlogReviewer, slugsLike, toContent } from "@/lib/queries/blog";
import { markPublished, refreshPublicBlog, verifyApproval } from "@/lib/blog-publish";
import { zonedTimeToUtc } from "@/lib/time";
import type { BlogFormState } from "@/lib/blog-state";

/**
 * Writing, reviewing and publishing blog posts.
 *
 * Practitioners and the founder write (`blog:write`). Approving is decided by
 * `canReview`: the founder, or a colleague she has named. Publishing checks
 * again that the version going live is the one approved, by its fingerprint,
 * so nothing reaches the website that a reviewer has not seen.
 *
 * Every action goes through the guard, so it is permission-checked and in the
 * activity log.
 */

type State = BlogFormState;

function str(fd: FormData, name: string) {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function guard(postId: string | undefined, action: "create" | "update", detail: string): Promise<Actor | State> {
  try {
    return await requireCapability("blog:write", { entity: "blog_posts", entityId: postId, action, detail });
  } catch (err) {
    if (err instanceof UnauthenticatedError) return { status: "error", message: "Your session has expired. Please sign in again." };
    if (err instanceof ForbiddenError) return { status: "error", message: err.message };
    throw err;
  }
}

const refused = (v: Actor | State): v is State => "status" in v && "message" in v;

async function load(id: string) {
  if (!UUID.test(id)) return null;
  const [row] = await getDb().select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  return row ?? null;
}

async function loadVersion(id: string | null) {
  if (!id) return null;
  const [row] = await getDb().select().from(blogPostVersions).where(eq(blogPostVersions.id, id)).limit(1);
  return row ?? null;
}

function refreshAdmin(id: string) {
  revalidatePath("/admin/blog");
  revalidatePath(`/admin/blog/${id}`);
}

/** Founder, or a colleague she has named: may take a post off the website. */
async function mayTakeDown(actor: Actor) {
  return actor.role === "founder" || (await isBlogReviewer(actor.userId));
}

async function notify(to: string[], email: { subject: string; html: string; text: string }) {
  for (const address of to) {
    try {
      const r = await sendEmail({ to: address, subject: email.subject, text: email.text, html: email.html });
      if (!r.ok) console.error("[blog] email not sent", r.reason);
    } catch (err) {
      console.error("[blog] email failed", err);
    }
  }
}

// ---------------------------------------------------------------------------

/** Start a post: a working title, a category and, optionally, a brief. */
export async function createPost(_prev: State, fd: FormData): Promise<State> {
  const title = str(fd, "title");
  if (!title) return { status: "error", message: "Give the post a working title." };
  if (title.length > LIMITS.title) return { status: "error", message: `Keep the title under ${LIMITS.title} characters.` };
  const parsed = parseContent({ title, category: str(fd, "category"), excerpt: "", body: "", sources: "" });
  if (!parsed.ok) return { status: "error", message: parsed.message };

  let brief = null;
  if (str(fd, "topic")) {
    const b = parseBrief(Object.fromEntries(fd));
    if (!b.ok) return { status: "error", message: b.message };
    brief = b.brief;
  }

  const actor = await guard(undefined, "create", "started a blog post");
  if (refused(actor)) return actor;

  const base = slugify(title);
  const slug = uniqueSlug(base, await slugsLike(base));
  const db = getDb();
  const [post] = await db
    .insert(blogPosts)
    .values({ slug, authorId: actor.userId, createdBy: actor.userId, brief })
    .returning({ id: blogPosts.id });
  const [version] = await db
    .insert(blogPostVersions)
    .values({ postId: post.id, number: 1, ...parsed.content, contentHash: contentHash(parsed.content), origin: "human_edit", createdBy: actor.userId })
    .returning({ id: blogPostVersions.id });
  await db.update(blogPosts).set({ currentVersionId: version.id }).where(eq(blogPosts.id, post.id));

  revalidatePath("/admin/blog");
  redirect(`/admin/blog/${post.id}`);
}

type Post = typeof blogPosts.$inferSelect;
type Version = typeof blogPostVersions.$inferSelect;
type Saved = { ok: true; post: Post; changed: boolean; slugChanged: boolean } | { ok: false; state: State };

const err = (message: string, saved = false): State => ({ status: "error", message, ...(saved ? { saved } : {}) });

/**
 * Save what's in the editor. A change makes a new version, sends the post
 * back to draft and clears any approval or schedule; a live post stays live,
 * as it was approved, until the new version is approved and published. The
 * caller has already passed the guard. Returns the post as it now stands.
 */
async function saveEditor(post: Post, actor: Actor, fd: FormData): Promise<Saved> {
  if (str(fd, "expectedVersionId") !== (post.currentVersionId ?? "")) {
    return { ok: false, state: err("Someone else has saved this post since you opened it. Copy your changes, reload the page and try again.") };
  }
  const current = await loadVersion(post.currentVersionId);
  const parsed = parseContent(Object.fromEntries(fd), { coverImage: current?.coverImage ?? null });
  if (!parsed.ok) return { ok: false, state: err(parsed.message) };

  // The address can change until the post first goes live; after that, links to it would break.
  let slug = post.slug;
  const wanted = str(fd, "slug");
  if (wanted && wanted !== post.slug) {
    if (post.firstPublishedAt) return { ok: false, state: err("The address can't change once a post has been on the website.") };
    if (!isValidSlug(wanted)) return { ok: false, state: err("Use lower-case letters, numbers and hyphens for the address.") };
    const [taken] = await getDb().select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.slug, wanted)).limit(1);
    if (taken) return { ok: false, state: err("Another post already uses that address.") };
    slug = wanted;
  }
  const slugChanged = slug !== post.slug;

  const hash = contentHash(parsed.content);
  const db = getDb();
  if (current && current.contentHash === hash) {
    if (slugChanged) await db.update(blogPosts).set({ slug, updatedAt: new Date() }).where(eq(blogPosts.id, post.id));
    return { ok: true, post: (await load(post.id)) ?? post, changed: false, slugChanged };
  }

  const [latest] = await db
    .select({ number: blogPostVersions.number })
    .from(blogPostVersions)
    .where(eq(blogPostVersions.postId, post.id))
    .orderBy(desc(blogPostVersions.number))
    .limit(1);

  try {
    const [version] = await db
      .insert(blogPostVersions)
      .values({
        postId: post.id,
        number: (latest?.number ?? 0) + 1,
        ...parsed.content,
        contentHash: hash,
        // Kept in the internal record: a version with any AI suggestion in it.
        origin: fd.get("aiAssisted") === "1" ? "ai_assist" : "human_edit",
        createdBy: actor.userId,
      })
      .returning({ id: blogPostVersions.id });
    await db
      .update(blogPosts)
      .set({ slug, currentVersionId: version.id, ...afterEdit(), updatedAt: new Date() })
      .where(eq(blogPosts.id, post.id));
  } catch (e) {
    console.error("[blog] save failed", e);
    return { ok: false, state: err("Someone else saved at the same moment. Reload the page and try again.") };
  }
  const saved = await load(post.id);
  if (!saved) return { ok: false, state: err("That post no longer exists.") };
  return { ok: true, post: saved, changed: true, slugChanged };
}

/** Save the editor. */
export async function saveVersion(_prev: State, fd: FormData): Promise<State> {
  const id = str(fd, "postId");
  const post = await load(id);
  if (!post) return err("That post no longer exists.");

  const actor = await guard(id, "update", "saved a blog post");
  if (refused(actor)) return actor;

  const saved = await saveEditor(post, actor, fd);
  if (!saved.ok) return saved.state;
  refreshAdmin(id);
  if (!saved.changed) return { status: "ok", message: saved.slugChanged ? "Address updated." : "No changes to save." };

  const wasApproved = post.approvedVersionId !== null && post.approvedVersionId === post.currentVersionId;
  const live = post.publishedVersionId !== null;
  return {
    status: "ok",
    message: wasApproved || post.status === "in_review"
      ? `Saved. The changes need reviewing again${live ? "; the website keeps the approved version until then" : ""}.`
      : live
        ? "Saved as a draft. The website keeps the approved version until this one is approved and published."
        : "Saved.",
  };
}

/** Mark the post as waiting for review and email everyone who could approve it, other than the sender. */
async function sendToReviewers(post: Post, version: Version, actor: Actor): Promise<State> {
  const now = new Date();
  await getDb()
    .update(blogPosts)
    .set({ status: "in_review", submittedAt: now, submittedBy: actor.userId, updatedAt: now })
    .where(eq(blogPosts.id, post.id));

  const reviewers = (await getBlogReviewers()).filter(
    (r) =>
      r.id !== actor.userId &&
      canReview({ actor: { userId: r.id, role: r.role, status: "active" }, isReviewer: true, authorId: post.authorId, versionCreatedBy: version.createdBy }).allowed
  );
  await notify(reviewers.map((r) => r.email), blogReviewRequest({ postId: post.id }));

  refreshAdmin(post.id);
  if (actor.role === "founder") return { status: "ok", message: "Ready for review. You can approve it below." };
  return {
    status: "ok",
    message: reviewers.length
      ? `Sent for review. ${reviewers.length === 1 ? "The reviewer has" : "The reviewers have"} been emailed a link.`
      : "Sent for review. There's nobody else who can approve it yet, so ask the founder to look at it.",
  };
}

/** Send the current version to the reviewers. */
export async function submitForReview(_prev: State, fd: FormData): Promise<State> {
  const id = str(fd, "postId");
  const post = await load(id);
  if (!post) return err("That post no longer exists.");
  if (!canSubmit(post)) return err(`It's ${STATUS_LABEL[post.status].toLowerCase()}, so it can't be sent for review now.`);

  const version = await loadVersion(post.currentVersionId);
  if (!version) return err("Save the post first.");
  const problems = reviewProblems(toContent(version));
  if (problems.length) return err(`Before sending it for review: ${problems.join(" ")}`);

  const actor = await guard(id, "update", "sent a blog post for review");
  if (refused(actor)) return actor;
  return sendToReviewers(post, version, actor);
}

/** Why a saved post that didn't change can't go for review or be approved again, if it can't. */
function nothingNew(post: Post): string | null {
  if (post.status === "in_review") return "It's already waiting for review.";
  if (post.status === "published" && post.publishedVersionId === post.currentVersionId) return "It's already on the website, just as it is.";
  if (post.status === "scheduled") return "It's already approved and scheduled.";
  if (post.status === "archived") return "It's archived. Restore it first.";
  return null;
}

/**
 * The editor's "Send for review": save what's on screen, then send that
 * version, so what the reviewer sees is always what was just written.
 */
async function saveAndSubmit(fd: FormData): Promise<State> {
  const id = str(fd, "postId");
  const post = await load(id);
  if (!post) return err("That post no longer exists.");

  const actor = await guard(id, "update", "saved a blog post and sent it for review");
  if (refused(actor)) return actor;

  const saved = await saveEditor(post, actor, fd);
  if (!saved.ok) return saved.state;
  refreshAdmin(id);
  const p = saved.post;
  if (!canSubmit(p)) {
    const why = nothingNew(p) ?? `It's ${STATUS_LABEL[p.status].toLowerCase()}, so it can't be sent for review now.`;
    return err(saved.changed ? `Saved. ${why}` : why, true);
  }
  const version = await loadVersion(p.currentVersionId);
  if (!version) return err("Save the post first.");
  const problems = reviewProblems(toContent(version));
  if (problems.length) return err(`Saved. Before it can go for review: ${problems.join(" ")}`, true);

  const sent = await sendToReviewers(p, version, actor);
  return { ...sent, saved: true };
}

/**
 * Record a reviewer's decision on a version, against its fingerprint. The
 * caller has checked that this person may decide, and that it's awaiting one.
 */
async function recordDecision(
  post: Post,
  version: Version,
  actor: Actor,
  decision: "approved" | "changes_requested",
  comment: string,
  checklist: Record<string, boolean>
): Promise<{ ok: true; live: boolean } | { ok: false; message: string }> {
  // The stored fingerprint must still match the content, or something has changed underneath.
  const hash = contentHash(toContent(version));
  if (hash !== version.contentHash) {
    console.error("[blog] content hash mismatch", version.id);
    return { ok: false, message: "This version can't be verified. Save the post again, then review it." };
  }

  const db = getDb();
  const live = post.publishedVersionId !== null && post.publishedVersionId === version.id;
  const now = new Date();
  await db.insert(blogReviews).values({
    postId: post.id,
    versionId: version.id,
    reviewerId: actor.userId,
    decision,
    comment: comment || null,
    checklist,
    contentHash: hash,
  });
  await db
    .update(blogPosts)
    .set(
      decision === "approved"
        ? { status: live ? "published" : "approved", approvedVersionId: version.id, updatedAt: now }
        : { status: "changes_requested", approvedVersionId: null, scheduledFor: null, updatedAt: now }
    )
    .where(eq(blogPosts.id, post.id));

  // Tell the author, unless they made the decision themselves.
  if (post.authorId && post.authorId !== actor.userId) {
    const [author] = await db.select({ email: users.email, status: users.status }).from(users).where(eq(users.id, post.authorId)).limit(1);
    if (author?.status === "active") await notify([author.email], blogReviewDecision({ postId: post.id, approved: decision === "approved" }));
  }
  return { ok: true, live };
}

/**
 * The editor's "Publish" for someone who may approve the post themselves:
 * save what's on screen, approve that exact version with the same four
 * confirmations as the review form, then publish it now or schedule it. Each
 * step checks what it always checks, so this is the review, not a way round it.
 */
async function saveAndPublish(fd: FormData): Promise<State> {
  const id = str(fd, "postId");
  const checklist = Object.fromEntries(REVIEW_CHECKS.map((c) => [c.key, fd.get(`check_${c.key}`) === "on"]));
  if (!checklistComplete(checklist)) return err("Tick all four confirmations to publish.");

  const later = str(fd, "publishWhen") === "later";
  let when: Date | null = null;
  if (later) {
    const [date, time] = str(fd, "when").split("T");
    when = date && time ? zonedTimeToUtc(date, time, "Europe/London") : new Date(NaN);
    const problem = scheduleProblem(when, new Date());
    if (problem) return err(problem);
  }

  const post = await load(id);
  if (!post) return err("That post no longer exists.");
  const actor = await guard(id, "update", later ? `approved a blog post and scheduled it for ${when!.toISOString()}` : "approved and published a blog post");
  if (refused(actor)) return actor;

  const saved = await saveEditor(post, actor, fd);
  if (!saved.ok) return saved.state;
  refreshAdmin(id);
  let p = saved.post;
  const pre = saved.changed ? "Saved, but not published. " : "";

  const version = await loadVersion(p.currentVersionId);
  if (!version) return err("Save the post first.");
  if (p.status === "published" && p.publishedVersionId === version.id && approvalStands(p)) {
    return { status: "ok", message: "It's already on the website, just as it is.", saved: true };
  }
  if (p.status === "archived") return err("It's archived. Restore it first.", true);

  const problems = reviewProblems(toContent(version));
  if (problems.length) return err(`${pre}Before it can be published: ${problems.join(" ")}`, true);

  const allowed = canReview({
    actor: { userId: actor.userId, role: actor.role, status: actor.status },
    isReviewer: await isBlogReviewer(actor.userId),
    authorId: p.authorId,
    versionCreatedBy: version.createdBy,
  });
  if (!allowed.allowed) return err(`${pre}${allowed.reason}`, true);

  if (!approvalStands(p)) {
    const r = await recordDecision(p, version, actor, "approved", "", checklist);
    if (!r.ok) return err(`${pre}${r.message}`, true);
    p = (await load(id)) ?? p;
  }

  if (later && when) {
    if (!canSchedule(p)) return err("Approved, but it couldn't be scheduled. Reload the page and try again.", true);
    await getDb().update(blogPosts).set({ status: "scheduled", scheduledFor: when, updatedAt: new Date() }).where(eq(blogPosts.id, id));
    refreshAdmin(id);
    return { status: "ok", message: "Approved and scheduled. It goes live within the hour after the time you chose.", saved: true };
  }

  const check = await verifyApproval(p);
  if (!check.ok) return err(`Approved, but not published: ${check.message}`, true);
  if (!(await markPublished(p, new Date()))) return err("Approved, but the post changed while publishing. Reload the page and try again.", true);
  refreshAdmin(id);
  return { status: "ok", message: "Published. It's on the website now.", saved: true };
}

/**
 * Everything the editor's buttons do, chosen by the button pressed: save,
 * save and send for review, or save, approve and publish.
 */
export async function editorAction(prev: State, fd: FormData): Promise<State> {
  const intent = str(fd, "intent");
  if (intent === "review") return saveAndSubmit(fd);
  if (intent === "publish") return saveAndPublish(fd);
  return saveVersion(prev, fd);
}

/** Take a post back out of review, to keep working on it. */
export async function withdrawFromReview(_prev: State, fd: FormData): Promise<State> {
  const id = str(fd, "postId");
  const post = await load(id);
  if (!post) return { status: "error", message: "That post no longer exists." };
  if (!canWithdraw(post)) return { status: "error", message: "It isn't waiting for review." };

  const actor = await guard(id, "update", "took a blog post back out of review");
  if (refused(actor)) return actor;

  await getDb().update(blogPosts).set({ status: "draft", updatedAt: new Date() }).where(eq(blogPosts.id, id));
  refreshAdmin(id);
  return { status: "ok", message: "Back to draft." };
}

/**
 * Approve the current version, or send it back with a comment. Approving
 * needs all four confirmations, and is recorded against the version's
 * fingerprint.
 */
export async function reviewPost(_prev: State, fd: FormData): Promise<State> {
  const id = str(fd, "postId");
  // "Approve and publish now" is an approval, followed by the same publishing step as the Publish button.
  const publishAfter = str(fd, "decision") === "approve_publish";
  const decision = publishAfter ? "approved" : str(fd, "decision");
  const comment = str(fd, "comment");
  if (decision !== "approved" && decision !== "changes_requested") return { status: "error", message: "Choose approve or request changes." };
  if (comment.length > LIMITS.comment) return { status: "error", message: `Keep the comment under ${LIMITS.comment} characters.` };
  if (decision === "changes_requested" && !comment) return { status: "error", message: "Say what needs to change." };

  const post = await load(id);
  if (!post) return { status: "error", message: "That post no longer exists." };
  if (str(fd, "versionId") !== post.currentVersionId) {
    return { status: "error", message: "The post has changed since you opened it. Reload the page to review the latest version." };
  }

  const actor = await guard(id, "update", decision === "approved" ? "approved a blog post" : "asked for changes to a blog post");
  if (refused(actor)) return actor;

  const db = getDb();
  const version = await loadVersion(post.currentVersionId);
  if (!version) return { status: "error", message: "That post has nothing to review yet." };

  const [approval] = await db
    .select({ id: blogReviews.id })
    .from(blogReviews)
    .where(and(eq(blogReviews.versionId, version.id), eq(blogReviews.decision, "approved")))
    .limit(1);
  if (!awaitingDecision(post, !!approval)) return { status: "error", message: "It isn't waiting for review." };

  const allowed = canReview({
    actor: { userId: actor.userId, role: actor.role, status: actor.status },
    isReviewer: await isBlogReviewer(actor.userId),
    authorId: post.authorId,
    versionCreatedBy: version.createdBy,
  });
  if (!allowed.allowed) return { status: "error", message: allowed.reason };

  const checklist = Object.fromEntries(REVIEW_CHECKS.map((c) => [c.key, fd.get(`check_${c.key}`) === "on"]));
  if (decision === "approved" && !checklistComplete(checklist)) {
    return { status: "error", message: "Tick all four confirmations to approve." };
  }

  const r = await recordDecision(post, version, actor, decision, comment, checklist);
  if (!r.ok) return err(r.message);
  refreshAdmin(id);
  if (r.live) refreshPublicBlog(post.slug);
  if (decision === "changes_requested") return { status: "ok", message: "Sent back with your comments." };
  if (r.live) return { status: "ok", message: "Approved. It was already on the website and stays there." };

  if (publishAfter) {
    const approved = await load(id);
    const check = approved ? await verifyApproval(approved) : { ok: false as const, message: "That post no longer exists." };
    if (!check.ok) return err(`Approved, but not published: ${check.message}`);
    if (!(await markPublished(approved!, new Date()))) return err("Approved, but the post changed while publishing. Reload the page and publish it.");
    refreshAdmin(id);
    return { status: "ok", message: "Approved and published. It's on the website now." };
  }
  return { status: "ok", message: "Approved. It can now be published or scheduled." };
}

/** Put the approved version on the website now. */
export async function publishPost(_prev: State, fd: FormData): Promise<State> {
  const id = str(fd, "postId");
  const post = await load(id);
  if (!post) return { status: "error", message: "That post no longer exists." };

  const actor = await guard(id, "update", "published a blog post");
  if (refused(actor)) return actor;

  const check = await verifyApproval(post);
  if (!check.ok) return { status: "error", message: check.message };
  if (!(await markPublished(post, new Date()))) return { status: "error", message: "The post changed while publishing. Reload the page and try again." };

  refreshAdmin(id);
  return { status: "ok", message: "Published. It's on the website now." };
}

/** Publish the approved version at a time of the author's choosing (UK time). */
export async function schedulePost(_prev: State, fd: FormData): Promise<State> {
  const id = str(fd, "postId");
  const [date, time] = str(fd, "when").split("T");
  const when = date && time ? zonedTimeToUtc(date, time, "Europe/London") : new Date(NaN);
  const problem = scheduleProblem(when, new Date());
  if (problem) return { status: "error", message: problem };

  const post = await load(id);
  if (!post) return { status: "error", message: "That post no longer exists." };
  if (!canSchedule(post)) return { status: "error", message: "Only an approved post can be scheduled." };

  const actor = await guard(id, "update", `scheduled a blog post for ${when.toISOString()}`);
  if (refused(actor)) return actor;

  await getDb().update(blogPosts).set({ status: "scheduled", scheduledFor: when, updatedAt: new Date() }).where(eq(blogPosts.id, id));
  refreshAdmin(id);
  return { status: "ok", message: "Scheduled. It goes live within the hour after the time you chose." };
}

export async function cancelSchedule(_prev: State, fd: FormData): Promise<State> {
  const id = str(fd, "postId");
  const post = await load(id);
  if (!post) return { status: "error", message: "That post no longer exists." };
  if (post.status !== "scheduled") return { status: "error", message: "It isn't scheduled." };

  const actor = await guard(id, "update", "cancelled a scheduled blog post");
  if (refused(actor)) return actor;

  await getDb()
    .update(blogPosts)
    .set({ status: post.publishedVersionId === post.approvedVersionId ? "published" : "approved", scheduledFor: null, updatedAt: new Date() })
    .where(eq(blogPosts.id, id));
  refreshAdmin(id);
  return { status: "ok", message: "Schedule cancelled. It's still approved." };
}

/**
 * Take a post off the website. The founder or a named reviewer only. The
 * approval goes with it: to come back, it is reviewed again.
 */
export async function unpublishPost(_prev: State, fd: FormData): Promise<State> {
  const id = str(fd, "postId");
  const post = await load(id);
  if (!post) return { status: "error", message: "That post no longer exists." };
  if (!canUnpublish(post)) return { status: "error", message: "It isn't on the website." };

  const actor = await guard(id, "update", "took a blog post off the website");
  if (refused(actor)) return actor;
  if (!(await mayTakeDown(actor))) {
    return { status: "error", message: "Only the founder or a blog reviewer can take a post off the website." };
  }

  await getDb()
    .update(blogPosts)
    .set({ status: "archived", publishedVersionId: null, approvedVersionId: null, scheduledFor: null, updatedAt: new Date() })
    .where(eq(blogPosts.id, id));
  refreshAdmin(id);
  refreshPublicBlog(post.slug);
  return { status: "ok", message: "Taken off the website and archived." };
}

/** Set aside a post that isn't on the website. */
export async function archivePost(_prev: State, fd: FormData): Promise<State> {
  const id = str(fd, "postId");
  const post = await load(id);
  if (!post) return { status: "error", message: "That post no longer exists." };
  if (!canArchive(post)) return { status: "error", message: "A post on the website is taken down, not archived." };

  const actor = await guard(id, "update", "archived a blog post");
  if (refused(actor)) return actor;

  await getDb()
    .update(blogPosts)
    .set({ status: "archived", approvedVersionId: null, scheduledFor: null, updatedAt: new Date() })
    .where(eq(blogPosts.id, id));
  refreshAdmin(id);
  return { status: "ok", message: "Archived." };
}

export async function restorePost(_prev: State, fd: FormData): Promise<State> {
  const id = str(fd, "postId");
  const post = await load(id);
  if (!post) return { status: "error", message: "That post no longer exists." };
  if (!canRestore(post)) return { status: "error", message: "It isn't archived." };

  const actor = await guard(id, "update", "restored an archived blog post");
  if (refused(actor)) return actor;

  await getDb().update(blogPosts).set({ status: "draft", updatedAt: new Date() }).where(eq(blogPosts.id, id));
  refreshAdmin(id);
  return { status: "ok", message: "Restored as a draft." };
}
