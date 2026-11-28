import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { BlogBody } from "@/components/BlogBody";
import { NotCrisisNotice } from "@/components/NotCrisisNotice";
import { Icon } from "@/components/icons";
import { displayDate, type BlogSource } from "@/lib/blog-rules";

/**
 * The article as readers see it. Used by the public page and by the staff
 * preview, so what a reviewer approves looks exactly like what goes live.
 */
export type ArticleViewProps = {
  title: string;
  body: string;
  sources: BlogSource[];
  coverSrc: string | null;
  coverAlt: string | null;
  authorName: string;
  reviewerName: string | null;
  firstPublishedAt: Date | null;
  publishedAt: Date | null;
  readTime: string;
  /** Likes and comments, on the website only. */
  engagement?: React.ReactNode;
};

export function ArticleView(p: ArticleViewProps) {
  const updated = p.firstPublishedAt && p.publishedAt && displayDate(p.publishedAt) !== displayDate(p.firstPublishedAt);
  return (
    <article style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontSize: 13.5, color: "var(--navy-soft)", flexWrap: "wrap" }}>
        <Link href="/blog" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--teal-deep)", fontWeight: 700, textDecoration: "none" }}>
          <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
            <Icon name="arrow" size={15} stroke="var(--teal-deep)" />
          </span>
          All articles
        </Link>
        <span>·</span>
        {p.firstPublishedAt ? (
          <time dateTime={p.firstPublishedAt.toISOString()}>{displayDate(p.firstPublishedAt)}</time>
        ) : (
          <span>Date set when published</span>
        )}
        <span>·</span>
        <span>{p.readTime}</span>
        {updated && p.publishedAt && (
          <>
            <span>·</span>
            <span>Updated {displayDate(p.publishedAt)}</span>
          </>
        )}
      </div>
      <p style={{ margin: "0 0 22px", fontSize: 13.5, color: "var(--navy-soft)" }}>
        By <strong style={{ color: "var(--navy)" }}>{p.authorName}</strong>
        {p.reviewerName && (
          <>
            {" · "}Reviewed by <strong style={{ color: "var(--navy)" }}>{p.reviewerName}</strong>
          </>
        )}
      </p>

      {p.coverSrc && (
        <Image
          src={p.coverSrc}
          alt={p.coverAlt ?? ""}
          width={1440}
          height={720}
          unoptimized
          priority
          style={{ width: "100%", height: "auto", maxHeight: 420, objectFit: "cover", borderRadius: 16, marginBottom: 26, display: "block" }}
        />
      )}

      <BlogBody markdown={p.body} />

      {p.sources.length > 0 && (
        <section aria-labelledby="sources" style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(31,58,95,0.12)" }}>
          <h2 id="sources" style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 800, color: "var(--navy)" }}>Sources</h2>
          <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6, fontSize: 14, lineHeight: 1.5, color: "var(--ink)" }}>
            {p.sources.map((s, i) => (
              <li key={`${s.url}-${i}`}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
                    {s.title}
                  </a>
                ) : (
                  <span>{s.title}</span>
                )}
                {s.publisher && <span>, {s.publisher}</span>}
                {s.accessed && <span style={{ color: "var(--navy-soft)" }}> (accessed {displayDate(new Date(`${s.accessed}T12:00:00Z`))})</span>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {p.engagement}

      <NotCrisisNotice style={{ marginTop: 32 }} />

      <div style={{ marginTop: 24, padding: "26px 24px", borderRadius: 16, background: "linear-gradient(135deg,#f2f6ee,#e6efe1)", textAlign: "center" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 20, color: "var(--navy)" }}>Need someone to talk to?</h3>
        <p style={{ margin: "0 auto 16px", maxWidth: 460, fontSize: 15, lineHeight: 1.55, color: "var(--ink)" }}>
          Our compassionate team is here to support your wellbeing, in confidence, from anywhere in the UK.
        </p>
        <Link href="/book" className="pill pill-gold" style={{ padding: "13px 26px", fontSize: 14.5 }}>
          Book a Session <Icon name="arrow" size={16} />
        </Link>
      </div>
    </article>
  );
}
