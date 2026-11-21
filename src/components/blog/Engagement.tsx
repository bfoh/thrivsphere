import { LikeButton } from "./LikeButton";
import { CommentForm } from "./CommentForm";
import { commentsLabel } from "@/lib/blog-comment-rules";
import { displayDate } from "@/lib/blog-rules";

/**
 * Likes, readers' approved comments and the form to add one. Comments are
 * shown as plain text: links in them aren't clickable.
 */
export function Engagement({ slug, comments }: { slug: string; comments: { id: string; name: string; body: string; createdAt: Date }[] }) {
  return (
    <section aria-labelledby="comments" style={{ marginTop: 32, paddingTop: 22, borderTop: "1px solid rgba(31,58,95,0.12)" }}>
      <LikeButton slug={slug} />
      <h2 id="comments" style={{ margin: "26px 0 14px", fontSize: 19, fontWeight: 800, color: "var(--navy)" }}>
        {comments.length ? commentsLabel(comments.length) : "Comments"}
      </h2>
      {comments.length === 0 ? (
        <p style={{ margin: "0 0 18px", fontSize: 14, color: "var(--navy-soft)" }}>No comments yet. You&apos;re welcome to share a thought.</p>
      ) : (
        <ol style={{ margin: "0 0 24px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
          {comments.map((c) => (
            <li key={c.id} style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(31,58,95,0.04)" }}>
              <div style={{ fontSize: 13, color: "var(--navy-soft)", marginBottom: 5 }}>
                <strong style={{ color: "var(--navy)" }}>{c.name}</strong> · <time dateTime={c.createdAt.toISOString()}>{displayDate(c.createdAt)}</time>
              </div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "var(--ink)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{c.body}</p>
            </li>
          ))}
        </ol>
      )}
      <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "var(--navy)" }}>Leave a comment</h3>
      <CommentForm slug={slug} />
    </section>
  );
}
