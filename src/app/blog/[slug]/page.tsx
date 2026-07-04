import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { ProseBody } from "@/components/ProseBody";
import { Icon } from "@/components/icons";
import { posts } from "@/data/site";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  return {
    title: post ? `${post.title} — ThrivSphere Blog` : "Article — ThrivSphere",
    description: post?.excerpt,
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <PageShell eyebrow={post.category} title={post.title} watermark="Article">
      <div style={{ maxWidth: 720 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, fontSize: 13.5, color: "var(--navy-soft)" }}>
          <a href="/blog" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--teal-deep)", fontWeight: 700, textDecoration: "none" }}>
            <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
              <Icon name="arrow" size={15} stroke="var(--teal-deep)" />
            </span>
            All articles
          </a>
          <span>·</span>
          <span>{post.date}</span>
          <span>·</span>
          <span>{post.read}</span>
        </div>

        <ProseBody body={post.body} />

        <div style={{ marginTop: 36, padding: "26px 24px", borderRadius: 16, background: "linear-gradient(135deg,#f2f6ee,#e6efe1)", textAlign: "center" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 20, color: "var(--navy)" }}>Need someone to talk to?</h3>
          <p style={{ margin: "0 auto 16px", maxWidth: 460, fontSize: 15, lineHeight: 1.55, color: "var(--ink)" }}>
            Our compassionate team is here to support your wellbeing, in confidence, from anywhere in the UK.
          </p>
          <a href="/book" className="pill pill-gold" style={{ padding: "13px 26px", fontSize: 14.5 }}>
            Book a Session <Icon name="arrow" size={16} />
          </a>
        </div>
      </div>
    </PageShell>
  );
}
