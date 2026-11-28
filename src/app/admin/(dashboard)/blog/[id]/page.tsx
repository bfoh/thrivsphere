import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/guard";
import { Section, Empty } from "@/components/admin/RecordUI";
import { BackLink } from "@/components/admin/BackLink";
import { StatusBadge } from "@/components/admin/blog/StatusBadge";
import { PostActionButton, PostEditor, ReviewForm, ScheduleForm } from "@/components/admin/blog/BlogForms";
import { aiConfigured } from "@/lib/ai/run";
import { archivePost, cancelSchedule, publishPost, restorePost, unpublishPost, withdrawFromReview } from "@/app/actions/blog";
import { getPostForEditor, isBlogReviewer, postEngagement, toContent } from "@/lib/queries/blog";
import { commentsLabel, likesLabel } from "@/lib/blog-comment-rules";
import {
  AUDIENCES,
  LENGTHS,
  awaitingDecision,
  canArchive,
  canPublish,
  canRestore,
  canReview,
  canSchedule,
  canSubmit,
  canUnpublish,
  canWithdraw,
  changedFields,
  contentFindings,
  diffParagraphs,
  type BlogContent,
} from "@/lib/blog-rules";
import { formatZonedDate } from "@/lib/time";

export const metadata: Metadata = { title: "Blog post", robots: { index: false, follow: false } };

const dt = (v: Date) =>
  v.toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const ORIGIN: Record<string, string> = {
  imported: "Moved from the old website",
  human_edit: "Edited",
  ai_draft: "AI draft",
  ai_assist: "Edited with AI help",
};

const EMPTY: BlogContent = { title: "", category: "", excerpt: "", metaDescription: null, body: "", sources: [], coverImage: null, coverAlt: null };

const note: React.CSSProperties = { margin: "0 0 18px", padding: "12px 16px", borderRadius: 12, fontSize: 14, lineHeight: 1.55 };

/**
 * One blog post: what's on the website, the draft being worked on, the review
 * and the history. Opening it is logged.
 */
export default async function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const actor = await requireCapability("blog:write", { entity: "blog_posts", entityId: id, action: "view", detail: "opened a blog post" });
  const [data, reviewer, engagement] = await Promise.all([getPostForEditor(id), isBlogReviewer(actor.userId), postEngagement(id)]);
  if (!data) notFound();

  const { post, current, published, baseline, versions, reviews, currentReviewed, authorName } = data;
  const content = current ? toContent(current.version) : EMPTY;
  const awaiting = awaitingDecision(post, currentReviewed);
  const decision = canReview({
    actor: { userId: actor.userId, role: actor.role, status: actor.status },
    isReviewer: reviewer,
    authorId: post.authorId,
    versionCreatedBy: current?.version.createdBy ?? null,
  });
  const mayTakeDown = actor.role === "founder" || reviewer;
  const live = post.publishedVersionId !== null;
  const showingOlder = live && post.publishedVersionId !== post.currentVersionId;
  // The founder approves her own posts, so her editor publishes; anyone else's sends for review.
  const selfApprove = canReview({
    actor: { userId: actor.userId, role: actor.role, status: actor.status },
    isReviewer: reviewer,
    authorId: post.authorId,
    versionCreatedBy: actor.userId,
  }).allowed;
  const lastRequest = reviews.find((r) => r.decision === "changes_requested" && post.status === "changes_requested");
  const baseContent = baseline ? toContent(baseline.version) : null;
  const diff = baseContent ? diffParagraphs(baseContent.body, content.body) : null;
  const fieldsChanged = baseContent ? changedFields(baseContent, content) : [];
  const findings = contentFindings(content);
  const now = new Date();
  const minSchedule = `${formatZonedDate(now, "Europe/London")}T00:00`;

  return (
    <div className="adm-page adm-page--narrow">
      <BackLink href="/admin/blog" label="Blog" />
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", margin: "12px 0 4px" }}>
        <h1 className="adm-title">{content.title || "Untitled"}</h1>
        <StatusBadge status={post.status} />
      </div>
      <p style={{ margin: "0 0 22px", fontSize: 14, color: "var(--navy-soft)" }}>
        By {authorName ?? "ThriveSphere team"}
        {current && <> · version {current.version.number}, saved {dt(current.version.createdAt)}</>}
        {" · "}
        <Link href={`/admin/blog/${post.id}/preview`} style={{ color: "var(--teal-deep)", fontWeight: 700 }}>Preview</Link>
        {live && (
          <>
            {" · "}
            <a href={`/blog/${post.slug}`} target="_blank" rel="noopener" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
              View on the website
            </a>
            {" · "}
            {likesLabel(engagement.likes)} · {commentsLabel(engagement.approved)}
            {engagement.pending > 0 && (
              <>
                {" ("}
                <Link href="/admin/blog/comments" style={{ color: "var(--a-gold)", fontWeight: 700 }}>
                  {engagement.pending} waiting for approval
                </Link>
                {")"}
              </>
            )}
          </>
        )}
      </p>

      {showingOlder && published && (
        <p style={{ ...note, background: "rgba(63,122,58,0.08)", color: "var(--ink)" }}>
          The website shows <strong>version {published.version.number}</strong>, as it was approved. The changes below aren&apos;t on
          the website until they&apos;re approved and published.
        </p>
      )}
      {awaiting && post.status === "published" && (
        <p style={{ ...note, background: "rgba(212,175,55,0.1)", color: "var(--ink)" }}>
          This post was on the website before reviews began, and hasn&apos;t been reviewed yet.
        </p>
      )}
      {lastRequest && (
        <div style={{ ...note, background: "var(--a-danger-soft)", color: "var(--ink)" }}>
          <strong style={{ color: "var(--a-danger)" }}>{lastRequest.reviewerName || lastRequest.reviewerEmail} asked for changes</strong> ({dt(lastRequest.createdAt)}):
          <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{lastRequest.comment}</div>
        </div>
      )}

      <Section title="Next step">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {canSubmit(post) && (
            <p style={{ margin: 0, fontSize: 14, color: "var(--ink)", lineHeight: 1.55 }}>
              {selfApprove ? (
                <>
                  Write below. When it&apos;s ready, press <strong>Publish…</strong> at the bottom of the editor: you tick the four review
                  checks, and it goes on the website now or on the date you choose.
                </>
              ) : (
                <>
                  Write below. When it&apos;s ready, press <strong>Save and send for review</strong> at the bottom of the editor. Patience,
                  or a colleague she has named as a reviewer, is emailed a link.
                </>
              )}
            </p>
          )}
          {canWithdraw(post) && (
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 14, color: "var(--ink)" }}>
                Waiting for review{data.submittedByName ? `, sent by ${data.submittedByName}` : ""}{post.submittedAt ? ` on ${dt(post.submittedAt)}` : ""}.
              </p>
              <PostActionButton action={withdrawFromReview} postId={post.id} label="Take it back to edit" tone="ghost" />
            </div>
          )}
          {canPublish(post) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ margin: 0, fontSize: 14, color: "var(--ink)" }}>
                {post.status === "scheduled" && post.scheduledFor
                  ? `Approved and scheduled for ${dt(post.scheduledFor)} (UK time). It goes live within the hour after that.`
                  : "Approved. Publish it now, or choose when it goes live."}
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                <PostActionButton action={publishPost} postId={post.id} label="Publish now" tone="gold" confirm="Put it on the website now?" />
                {post.status === "scheduled" && <PostActionButton action={cancelSchedule} postId={post.id} label="Cancel the schedule" tone="ghost" />}
              </div>
              {canSchedule(post) && post.status !== "scheduled" && <ScheduleForm postId={post.id} min={minSchedule} />}
            </div>
          )}
          {post.status === "published" && !showingOlder && (
            <p style={{ margin: 0, fontSize: 14, color: "var(--ink)" }}>
              On the website since {post.firstPublishedAt ? dt(post.firstPublishedAt) : "—"}. To change it, edit below: the website keeps this version until the new one is approved.
            </p>
          )}
          {canRestore(post) && (
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 14, color: "var(--ink)" }}>Archived. Restore it to keep working on it.</p>
              <PostActionButton action={restorePost} postId={post.id} label="Restore as a draft" tone="ghost" />
            </div>
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", paddingTop: 10, borderTop: "1px solid var(--a-line)" }}>
            {canUnpublish(post) && mayTakeDown && (
              <PostActionButton action={unpublishPost} postId={post.id} label="Take off the website" tone="danger" confirm="Remove it from the website? It will need reviewing again to come back." />
            )}
            {canArchive(post) && <PostActionButton action={archivePost} postId={post.id} label="Archive" tone="ghost" confirm="Set this post aside?" />}
          </div>
        </div>
      </Section>

      {awaiting && current && (
        <Section title="Review" subtitle={`Version ${current.version.number}. Read the preview in full before deciding.`}>
          {decision.allowed ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <p style={{ margin: 0, fontSize: 14 }}>
                <Link href={`/admin/blog/${post.id}/preview`} style={{ color: "var(--teal-deep)", fontWeight: 800 }}>
                  Read it as it will appear on the website
                </Link>
              </p>
              <div>
                <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 800, color: "var(--navy)" }}>Automatic checks</p>
                {findings.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13.5, color: "var(--navy-soft)" }}>Nothing flagged. The checks look for warning signs; they don&apos;t replace reading it.</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)" }}>
                    {findings.map((f) => (
                      <li key={f.message}>{f.message}</li>
                    ))}
                  </ul>
                )}
              </div>
              {diff && baseline && (
                <details>
                  <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 800, color: "var(--navy)" }}>
                    What changed since version {baseline.version.number}
                    {fieldsChanged.length > 0 ? ` (also: ${fieldsChanged.join(", ")})` : ""}
                  </summary>
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    {diff.every((d) => d.kind === "same") ? (
                      <p style={{ margin: 0, fontSize: 13.5, color: "var(--navy-soft)" }}>The text is unchanged.</p>
                    ) : (
                      diff.map((d, i) => (
                        <p
                          key={i}
                          style={{
                            margin: 0,
                            padding: "6px 10px",
                            borderRadius: 8,
                            fontSize: 13.5,
                            lineHeight: 1.55,
                            whiteSpace: "pre-wrap",
                            background: d.kind === "added" ? "var(--a-ok-soft)" : d.kind === "removed" ? "var(--a-danger-soft)" : "transparent",
                            color: d.kind === "same" ? "var(--navy-soft)" : "var(--ink)",
                            textDecoration: d.kind === "removed" ? "line-through" : "none",
                          }}
                        >
                          {d.kind === "added" ? "+ " : d.kind === "removed" ? "− " : ""}
                          {d.text}
                        </p>
                      ))
                    )}
                  </div>
                </details>
              )}
              {(current.version.origin === "ai_assist" || current.version.origin === "ai_draft") && (
                <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "var(--a-gold)" }}>
                  This version was written with AI help. Check every fact against the sources, and that it sounds like us.
                </p>
              )}
              <ReviewForm postId={post.id} versionId={current.version.id} offerPublish={post.publishedVersionId !== post.currentVersionId} />
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: "var(--ink)" }}>
              {reviewer || actor.role === "founder" ? decision.reason : "Waiting for Patience, or a colleague she has named as a blog reviewer, to approve it."}
            </p>
          )}
        </Section>
      )}

      <Section title="Write" subtitle={live ? "Saving makes a new version for review. The website keeps the approved version until then." : "Saving makes a new version. Any change after approval needs approving again."}>
        <PostEditor
          postId={post.id}
          versionId={post.currentVersionId}
          slug={post.slug}
          slugEditable={!post.firstPublishedAt}
          initial={content}
          status={post.status}
          selfApprove={selfApprove}
          onWebsiteAsIs={live && post.publishedVersionId === post.currentVersionId}
          minSchedule={minSchedule}
          aiOn={aiConfigured()}
        />
      </Section>

      {post.brief && (
        <Section title="Brief">
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 16px", fontSize: 14, color: "var(--ink)" }}>
            <dt style={{ fontWeight: 800, color: "var(--navy)" }}>Topic</dt>
            <dd style={{ margin: 0 }}>{post.brief.topic}</dd>
            <dt style={{ fontWeight: 800, color: "var(--navy)" }}>For</dt>
            <dd style={{ margin: 0 }}>{AUDIENCES.find((a) => a.value === post.brief?.audience)?.label ?? post.brief.audience}</dd>
            <dt style={{ fontWeight: 800, color: "var(--navy)" }}>Length</dt>
            <dd style={{ margin: 0 }}>{LENGTHS.find((l) => l.value === post.brief?.length)?.label ?? post.brief.length}</dd>
            {post.brief.takeaway && (
              <>
                <dt style={{ fontWeight: 800, color: "var(--navy)" }}>Main message</dt>
                <dd style={{ margin: 0 }}>{post.brief.takeaway}</dd>
              </>
            )}
            {post.brief.notes && (
              <>
                <dt style={{ fontWeight: 800, color: "var(--navy)" }}>Notes</dt>
                <dd style={{ margin: 0, whiteSpace: "pre-wrap" }}>{post.brief.notes}</dd>
              </>
            )}
          </dl>
        </Section>
      )}

      <Section title="History">
        {versions.length === 0 && reviews.length === 0 ? (
          <Empty>Nothing yet.</Empty>
        ) : (
          <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 11 }}>
            {[
              ...versions.map((v) => ({ at: v.version.createdAt, key: `v-${v.version.id}`, kind: "version" as const, v })),
              ...reviews.map((r) => ({ at: r.createdAt, key: `r-${r.id}`, kind: "review" as const, r })),
            ]
              .sort((a, b) => b.at.getTime() - a.at.getTime())
              .map((item) =>
                item.kind === "version" ? (
                  <li key={item.key} style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink)" }}>
                    <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--navy-soft)" }}>
                      Version {item.v.version.number}
                    </span>{" "}
                    {ORIGIN[item.v.version.origin] ?? item.v.version.origin}
                    {item.v.version.id === post.publishedVersionId && <strong style={{ color: "var(--a-ok)" }}> · on the website</strong>}
                    {item.v.version.id === post.approvedVersionId && item.v.version.id !== post.publishedVersionId && (
                      <strong style={{ color: "var(--teal-deep)" }}> · approved</strong>
                    )}
                    {" · "}
                    <Link href={`/admin/blog/${post.id}/preview?v=${item.v.version.number}`} style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
                      view
                    </Link>
                    <div style={{ fontSize: 12, color: "var(--navy-soft)" }}>
                      {dt(item.v.version.createdAt)} · {item.v.makerName || item.v.makerEmail || "ThriveSphere"}
                    </div>
                  </li>
                ) : (
                  <li key={item.key} style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink)" }}>
                    <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: item.r.decision === "approved" ? "var(--teal-deep)" : "var(--a-danger)" }}>
                      {item.r.decision === "approved" ? "Approved" : "Changes requested"}
                    </span>{" "}
                    version {versions.find((v) => v.version.id === item.r.versionId)?.version.number ?? "?"}
                    {item.r.comment && <div style={{ whiteSpace: "pre-wrap" }}>{item.r.comment}</div>}
                    <div style={{ fontSize: 12, color: "var(--navy-soft)" }}>
                      {dt(item.r.createdAt)} · {item.r.reviewerName || item.r.reviewerEmail}
                    </div>
                  </li>
                )
              )}
          </ol>
        )}
      </Section>
    </div>
  );
}
