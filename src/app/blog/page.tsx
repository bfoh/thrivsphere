import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { Icon } from "@/components/icons";
import { posts } from "@/data/site";

export const metadata: Metadata = {
  title: "Blog — ThrivSphere Wellbeing CIC",
  description: "Wellbeing insights, gentle guidance and stories of resilience from the ThrivSphere community.",
};

const cat = ["#4fa8a8", "#d4af37", "#c77fa0", "#7a9e6e"];

export default function BlogPage() {
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
          <a key={p.slug} href={`/blog/${p.slug}`} className="tile" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: cat[i % cat.length], background: `${cat[i % cat.length]}18`, padding: "5px 11px", borderRadius: 50 }}>
                {p.category}
              </span>
              <span style={{ fontSize: 12.5, color: "var(--navy-soft)" }}>{p.date} · {p.read}</span>
            </div>
            <h2 style={{ margin: 0, fontSize: 23, color: "var(--navy)", lineHeight: 1.2 }}>{p.title}</h2>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>{p.excerpt}</p>
            <span className="tile-arrow" style={{ marginTop: 2 }}>
              Read article <Icon name="arrow" size={15} stroke="var(--teal-deep)" />
            </span>
          </a>
        ))}
      </div>
      <p style={{ marginTop: 26, textAlign: "center", fontSize: 13.5, color: "var(--navy-soft)" }}>
        More articles coming soon. Subscribe to our newsletter to be notified.
      </p>
    </PageShell>
  );
}
