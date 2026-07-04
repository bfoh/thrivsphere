import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { ProseBody } from "@/components/ProseBody";
import { Icon } from "@/components/icons";
import { resources } from "@/data/site";

export function generateStaticParams() {
  return resources.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const res = resources.find((r) => r.slug === slug);
  return {
    title: res ? `${res.title} — ThrivSphere Resources` : "Resource — ThrivSphere",
    description: res?.desc,
  };
}

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = resources.find((r) => r.slug === slug);
  if (!res) notFound();

  return (
    <PageShell eyebrow={res.category} title={res.title} intro={res.desc} watermark="Resource">
      <div style={{ maxWidth: 720 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, fontSize: 13.5, color: "var(--navy-soft)" }}>
          <a href="/resources" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--teal-deep)", fontWeight: 700, textDecoration: "none" }}>
            <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
              <Icon name="arrow" size={15} stroke="var(--teal-deep)" />
            </span>
            Resource Centre
          </a>
          <span>·</span>
          <span>{res.type}</span>
        </div>

        <ProseBody body={res.body} />

        <div style={{ marginTop: 36, padding: "26px 24px", borderRadius: 16, background: "linear-gradient(135deg,#eef6f4,#e2efe9)", textAlign: "center" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 20, color: "var(--navy)" }}>Want to go deeper?</h3>
          <p style={{ margin: "0 auto 16px", maxWidth: 460, fontSize: 15, lineHeight: 1.55, color: "var(--ink)" }}>
            Work one-to-one with our team to put these tools into practice, at a pace that feels right for you.
          </p>
          <a href="/book" className="pill pill-teal" style={{ padding: "13px 26px", fontSize: 14.5 }}>
            Book a Session <Icon name="arrow" size={16} />
          </a>
        </div>
      </div>
    </PageShell>
  );
}
