import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/guard";
import { getGuide, worksheetTemplate } from "@/lib/forms/registry";
import { PrintButton } from "@/components/forms/PrintButton";
import { BackLink } from "@/components/admin/BackLink";

export const metadata: Metadata = { title: "Practitioner guide", robots: { index: false, follow: false } };

export default async function WorksheetGuidePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  await requireCapability("worksheet:manage", {
    entity: "resources",
    action: "view",
    detail: `opened the practitioner guide for ${key}`,
  });

  const template = worksheetTemplate(key);
  const guide = getGuide(key);
  if (!template || !guide) notFound();

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 24px 80px" }}>
      <BackLink href="/admin/resources" label="Resources" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, flexWrap: "wrap", margin: "16px 0 4px" }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "var(--navy)" }}>{guide.title}</h1>
        <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={`/admin/resources/worksheets/${key}/print`} className="pill pill-ghost" style={{ padding: "9px 18px", fontSize: 13.5 }}>
            Client&apos;s printable copy
          </Link>
          <PrintButton label="Print this guide" />
        </div>
      </div>
      <p style={{ margin: "0 0 22px", fontSize: 14.5, color: "var(--navy-soft)" }}>For: {template.title}</p>

      {guide.sections.map((s) => (
        <section
          key={s.heading}
          className="card"
          style={{
            padding: "18px 22px",
            marginBottom: 14,
            ...(s.tone === "safety" ? { background: "var(--navy)", color: "#e7eefa" } : {}),
          }}
        >
          <h2 style={{ margin: "0 0 8px", fontSize: 16.5, fontWeight: 800, color: s.tone === "safety" ? "#fff" : "var(--navy)" }}>
            {s.heading}
          </h2>
          {s.paragraphs?.map((p) => (
            <p key={p} style={{ margin: "0 0 8px", fontSize: 14.5, lineHeight: 1.6 }}>
              {p}
            </p>
          ))}
          {s.bullets && (
            <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6, fontSize: 14.5, lineHeight: 1.6 }}>
              {s.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
          {s.steps && (
            <ol style={{ margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 6, fontSize: 14.5, lineHeight: 1.6 }}>
              {s.steps.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ol>
          )}
          {s.tone === "safety" && (
            <p className="no-print" style={{ margin: "10px 0 0" }}>
              <Link href="/admin/safeguarding" style={{ color: "#fff", fontWeight: 700 }}>
                Safeguarding →
              </Link>
            </p>
          )}
        </section>
      ))}

      <p style={{ margin: "18px 0 0", fontSize: 13.5, color: "var(--navy-soft)", fontStyle: "italic", lineHeight: 1.55 }}>
        {guide.disclaimer}
      </p>
    </div>
  );
}
