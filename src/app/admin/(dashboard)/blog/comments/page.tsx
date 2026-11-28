import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability } from "@/lib/guard";
import { Section, Empty } from "@/components/admin/RecordUI";
import { BackLink } from "@/components/admin/BackLink";
import { CommentModeration } from "@/components/admin/blog/CommentModeration";
import { getCommentQueue } from "@/lib/queries/blog";
import { decryptSecret } from "@/lib/crypto";

export const metadata: Metadata = { title: "Blog comments", robots: { index: false, follow: false } };

const dt = (v: Date) =>
  v.toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

type Row = Awaited<ReturnType<typeof getCommentQueue>>["waiting"][number];

/**
 * Readers' comments. Nothing a reader writes is on the website until someone
 * here approves it. Comments that suggest the writer may be at risk come
 * first. The writer's email is shown here only, for following up; opening the
 * page is logged.
 */
export default async function BlogCommentsPage() {
  await requireCapability("blog:write", { entity: "blog_comments", action: "view", detail: "viewed blog comments, with commenters' emails" });
  const { waiting, decided } = await getCommentQueue();

  return (
    <div className="adm-page">
      <BackLink href="/admin/blog" label="Blog" />
      <h1 className="adm-title" style={{ margin: "12px 0 6px" }}>Readers&apos; comments</h1>
      <p style={{ margin: "0 0 22px", fontSize: 14, lineHeight: 1.6, color: "var(--navy-soft)", maxWidth: 680 }}>
        Approve a comment to put it on its post. Don&apos;t publish anything that identifies someone, gives personal or health
        details, or isn&apos;t safe for other readers. If a comment suggests someone may be at risk, follow the safeguarding
        procedure: their email address is below.
      </p>

      <Section title="Waiting for approval" subtitle={`${waiting.length} ${waiting.length === 1 ? "comment" : "comments"}`}>
        {waiting.length === 0 ? <Empty>Nothing waiting.</Empty> : <List rows={waiting} />}
      </Section>

      <Section title="Recently decided" subtitle="The last 50 approved or hidden. Hidden comments are deleted after 90 days.">
        {decided.length === 0 ? <Empty>None yet.</Empty> : <List rows={decided} />}
      </Section>
    </div>
  );
}

function List({ rows }: { rows: Row[] }) {
  return (
    <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map((c) => (
        <li
          key={c.id}
          style={{
            border: `1px solid ${c.needsAttention && c.status === "pending" ? "rgba(161,66,28,0.45)" : "rgba(31,58,95,0.1)"}`,
            background: c.needsAttention && c.status === "pending" ? "rgba(161,66,28,0.04)" : "transparent",
            borderRadius: 12,
            padding: "14px 17px",
          }}
        >
          {c.needsAttention && (
            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: "#a1421c" }}>
              Possible risk: read and follow up
            </p>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "baseline", fontSize: 13, color: "var(--navy-soft)" }}>
            <strong style={{ fontSize: 14, color: "var(--navy)" }}>{c.name}</strong>
            <span>{decryptSecret(c.emailEnc) ?? "email unreadable"}</span>
            <span>· {dt(c.createdAt)}</span>
            <span>
              · on{" "}
              <Link href={`/admin/blog/${c.postId}`} style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
                {c.title ?? c.slug}
              </Link>
            </span>
          </div>
          <p style={{ margin: "8px 0 10px", fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{c.body}</p>
          {c.flags.length > 0 && (
            <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "#8a6d12", fontWeight: 700 }}>Noticed: {c.flags.join(" · ")}</p>
          )}
          {c.status !== "pending" && (
            <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--navy-soft)" }}>
              {c.status === "approved" ? "Approved" : "Hidden"}
              {c.moderatedAt ? ` ${dt(c.moderatedAt)}` : ""}
              {c.moderatorName || c.moderatorEmail ? ` by ${c.moderatorName || c.moderatorEmail}` : ""}
              {c.status === "approved" && !c.live ? " · the post isn't on the website now" : ""}
            </p>
          )}
          <CommentModeration commentId={c.id} status={c.status} />
        </li>
      ))}
    </ol>
  );
}
