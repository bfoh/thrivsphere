import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability } from "@/lib/guard";
import { Section, Empty } from "@/components/admin/RecordUI";
import { listAssets } from "@/lib/queries/marketing";
import { rightsLabel } from "@/lib/asset-rules";
import { UploadForm } from "@/components/admin/marketing/LibraryForms";
import { h1, lead } from "@/components/admin/marketing/ui";

export const metadata: Metadata = { title: "Photos & graphics", robots: { index: false, follow: false } };

const SOURCE = { upload: "Photo", template: "Graphic", ai_generated: "AI image" } as const;

/** The marketing library: photos staff add, graphics made from templates, AI images. */
export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireCapability("marketing:write", { entity: "marketing_assets", action: "view", detail: "viewed the marketing library" });
  const archived = (await searchParams).show === "archived";
  const rows = await listAssets({ archived });

  return (
    <div className="adm-page">
      <h1 className="adm-title" style={h1}>Photos &amp; graphics</h1>
      <p style={lead}>
        Images for posts and the newsletter, each with who owns it and a description for people who can&apos;t see it. Files are
        private: only staff can open them here.
      </p>

      {!archived && (
        <details className="card" style={{ padding: "16px 20px", marginBottom: 18 }}>
          <summary style={{ cursor: "pointer", fontSize: 15, fontWeight: 800, color: "var(--navy)" }}>Add a photo</summary>
          <div style={{ marginTop: 16, maxWidth: 560 }}>
            <UploadForm />
          </div>
        </details>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Link href="/admin/marketing/library" className={`pill ${archived ? "pill-ghost" : "pill-teal"}`} style={{ padding: "7px 14px", fontSize: 13 }}>In use</Link>
        <Link href="/admin/marketing/library?show=archived" className={`pill ${archived ? "pill-teal" : "pill-ghost"}`} style={{ padding: "7px 14px", fontSize: 13 }}>Archived</Link>
      </div>

      {rows.length === 0 ? (
        <Section title={archived ? "Nothing archived" : "Nothing here yet"}>
          <Empty>{archived ? "Archived images appear here." : "Add a photo above, or make a graphic."}</Empty>
        </Section>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {rows.map(({ asset }) => (
            <li key={asset.id} className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <Link href={`/admin/marketing/library/${asset.id}`} style={{ display: "block", background: "var(--a-subtle)", aspectRatio: "1 / 1" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/admin/marketing/assets/${asset.id}`} alt={asset.altText ?? ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
              </Link>
              <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                <Link href={`/admin/marketing/library/${asset.id}`} style={{ fontSize: 13.5, fontWeight: 800, color: "var(--navy)", textDecoration: "none", lineHeight: 1.35 }}>{asset.title}</Link>
                <span style={{ fontSize: 12, color: "var(--navy-soft)" }}>
                  {SOURCE[asset.source]} · {rightsLabel(asset.rights)}
                  {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
                </span>
                {!asset.altText && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--a-danger)" }}>Needs a description</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
