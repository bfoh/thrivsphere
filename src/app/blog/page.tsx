import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Icon } from "@/components/icons";
import { getPublishedPosts } from "@/lib/queries/blog";
import { displayDate } from "@/lib/blog-rules";

export const metadata: Metadata = {
  title: "Blog",
  description: "Wellbeing insights, gentle guidance and stories of resilience from the ThriveSphere community.",
  alternates: { canonical: "/blog", types: { "application/rss+xml": "/blog/rss.xml" } },
};

/** Refreshed every five minutes, and straight away when a post is published or taken down. */
export const revalidate = 300;

const cat = ["#4fa8a8", "#d4af37", "#c77fa0", "#7a9e6e"];

export default async function BlogPage() {
  const posts = await getPublishedPosts();
  return (
    <PageShell
      eyebrow="Blog"
      watermark="Blog"
      title="Wellbeing insights & stories of resilience"
      intro="Gentle, practical guidance to support your emotional wellbeing — written with compassion by our team."
      aura="sage"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {posts.map((p, i) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="tile" style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {p.coverImage && (
              <Image
                src={`/blog/images/${p.coverImage}`}
                alt={p.coverAlt ?? ""}
                width={1000}
                height={420}
                unoptimized
                style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
              />
            )}
            <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: cat[i % cat.length], background: `${cat[i % cat.length]}18`, padding: "5px 11px", borderRadius: 50 }}>
                  {p.category}
                </span>
                <span style={{ fontSize: 12.5, color: "var(--navy-soft)" }}>
                  {displayDate(p.firstPublishedAt)} · {p.readTime}
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: 23, color: "var(--navy)", lineHeight: 1.2 }}>{p.title}</h2>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>{p.excerpt}</p>
              <span className="tile-arrow" style={{ marginTop: 2 }}>
                Read article <Icon name="arrow" size={15} stroke="var(--teal-deep)" />
              </span>
            </div>
          </Link>
        ))}
      </div>
      <p style={{ marginTop: 26, textAlign: "center", fontSize: 13.5, color: "var(--navy-soft)" }}>
        {posts.length === 0 ? "Our first articles are on their way." : "More articles coming soon."}
      </p>
    </PageShell>
  );
}
