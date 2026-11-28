import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability } from "@/lib/guard";
import { Section, Empty } from "@/components/admin/RecordUI";
import { listPostsForAdmin, isBlogReviewer, pendingCommentCount } from "@/lib/queries/blog";
import { STATUS_LABEL, type BlogStatus } from "@/lib/blog-rules";
import { STATUS_COLOUR } from "@/components/admin/blog/StatusBadge";
import { Tabs } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Blog", robots: { index: false, follow: false } };

const dt = (v: Date) =>
  v.toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const VIEWS: { key: string; label: string; statuses?: BlogStatus[] }[] = [
  { key: "active", label: "In progress", statuses: ["draft", "in_review", "changes_requested", "approved", "scheduled"] },
  { key: "review", label: "Waiting for review", statuses: ["in_review"] },
  { key: "published", label: "Published", statuses: ["published"] },
  { key: "archived", label: "Archived", statuses: ["archived"] },
  { key: "all", label: "All" },
];

/**
 * Blog posts: drafts, posts waiting for review, and what's on the website.
 * Nothing goes live until the founder, or a colleague she has named, approves it.
 */
export default async function BlogAdminPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const actor = await requireCapability("blog:write", { entity: "blog_posts", action: "view", detail: "viewed blog posts" });
  const show = (await searchParams).show ?? "active";
  const view = VIEWS.find((v) => v.key === show) ?? VIEWS[0];
  const [rows, reviewer, comments] = await Promise.all([listPostsForAdmin(view.statuses), isBlogReviewer(actor.userId), pendingCommentCount()]);
  const canApprove = actor.role === "founder" || reviewer;

  return (
    <div className="adm-page">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 className="adm-title" style={{ margin: "0 0 6px" }}>Blog</h1>
          <p style={{ margin: "0 0 24px", fontSize: 14, lineHeight: 1.6, color: "var(--navy-soft)", maxWidth: 640 }}>
            Write posts for the website&apos;s blog. Every post is reviewed before it goes live
            {canApprove ? ", and you are one of the reviewers" : " by Patience or a colleague she has named"}. Changing a
            published post keeps the approved version on the website until the new one is approved.
          </p>
        </div>
        <Link href="/admin/blog/new" className="pill pill-gold" style={{ padding: "10px 20px", fontSize: 13.5 }}>
          New post
        </Link>
      </div>

      <Link
        href="/admin/blog/comments"
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 18,
          padding: "12px 16px",
          borderRadius: 12,
          textDecoration: "none",
          border: `1px solid ${comments.urgent ? "var(--a-danger-line)" : "var(--a-line)"}`,
          background: comments.urgent ? "var(--a-danger-soft)" : "#fff",
          color: "var(--ink)",
          fontSize: 14,
        }}
      >
        <strong style={{ color: "var(--navy)" }}>Readers&apos; comments</strong>
        <span>
          {comments.total === 0
            ? "nothing waiting for approval"
            : `${comments.total} waiting for approval${comments.urgent ? `, ${comments.urgent} may need attention soon` : ""}`}
        </span>
        <span style={{ marginLeft: "auto", color: "var(--teal-deep)", fontWeight: 700 }}>Open</span>
      </Link>

      <div style={{ marginBottom: 16 }}>
        <Tabs
          label="Which posts"
          items={VIEWS.map((v) => ({
            label: v.label,
            href: v.key === "active" ? "/admin/blog" : `/admin/blog?show=${v.key}`,
            active: v.key === view.key,
          }))}
        />
      </div>

      <Section title={view.label} subtitle={`${rows.length} ${rows.length === 1 ? "post" : "posts"}, most recently changed first`}>
        {rows.length === 0 ? (
          <Empty>{view.key === "active" ? "Nothing in progress. Start a new post." : "No posts here."}</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((p) => (
              <Link
                key={p.id}
                href={`/admin/blog/${p.id}`}
                style={{ display: "block", border: "1px solid var(--a-line)", borderRadius: 12, padding: "13px 17px", textDecoration: "none", color: "inherit" }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 15, color: "var(--navy)" }}>{p.title ?? "Untitled"}</strong>
                  <span style={{ fontSize: 12.5, color: "var(--navy-soft)" }}>{p.category}</span>
                  {p.publishedVersionId && p.status !== "published" && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--a-ok)" }}>on the website (earlier version)</span>
                  )}
                  <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 800, color: STATUS_COLOUR[p.status] }}>
                    {STATUS_LABEL[p.status]}
                    {p.status === "scheduled" && p.scheduledFor ? ` for ${dt(p.scheduledFor)}` : ""}
                  </span>
                </div>
                <div style={{ marginTop: 4, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: "var(--navy-soft)" }}>
                  <span>By {p.authorName || p.authorEmail || "ThriveSphere team"}</span>
                  <span>Changed {dt(p.updatedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
