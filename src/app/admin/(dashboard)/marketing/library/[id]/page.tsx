import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/guard";
import { Section, Field } from "@/components/admin/RecordUI";
import { getAsset } from "@/lib/queries/marketing";
import { setArchived } from "@/app/actions/marketing-assets";
import { AssetDetailsForm } from "@/components/admin/marketing/LibraryForms";
import { aiConfigured } from "@/lib/ai/run";
import { h1, page } from "@/components/admin/marketing/ui";

export const metadata: Metadata = { title: "Image", robots: { index: false, follow: false } };

const dt = (v: Date) => v.toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCapability("marketing:write", { entity: "marketing_assets", entityId: /^[0-9a-f-]{36}$/.test(id) ? id : null, action: "view", detail: "viewed an image" });
  const asset = await getAsset(id);
  if (!asset) notFound();
  const src = `/api/admin/marketing/assets/${asset.id}`;

  return (
    <div style={page}>
      <Link href="/admin/marketing/library" style={{ fontSize: 13, fontWeight: 700 }}>← Photos &amp; graphics</Link>
      <h1 style={{ ...h1, marginTop: 10 }}>{asset.title}</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, alignItems: "start" }}>
        <div>
          <div className="card" style={{ padding: 12, marginBottom: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={asset.altText ?? ""} style={{ width: "100%", height: "auto", display: "block", borderRadius: 8 }} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href={`${src}?download=1`} className="pill pill-teal" style={{ padding: "9px 18px", fontSize: 13 }}>Download</a>
            <form action={setArchived}>
              <input type="hidden" name="id" value={asset.id} />
              <input type="hidden" name="archive" value={asset.archivedAt ? "0" : "1"} />
              <button type="submit" className="pill pill-ghost" style={{ padding: "9px 18px", fontSize: 13 }}>{asset.archivedAt ? "Restore" : "Archive"}</button>
            </form>
          </div>
          <Section title="About this file">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Size" value={`${asset.width ?? "?"} × ${asset.height ?? "?"} px, ${kb(asset.bytes)}`} small />
              <Field label="Added" value={dt(asset.createdAt)} small />
              <Field label="Made from" value={asset.source === "upload" ? "Uploaded photo" : asset.source === "template" ? `Template (${asset.templateKey})` : `AI (${asset.aiModel ?? asset.aiProvider ?? "unknown"})`} small />
              <Field label="Status" value={asset.archivedAt ? `Archived ${dt(asset.archivedAt)}` : "In use"} small />
            </div>
          </Section>
        </div>
        <Section title="Details">
          <AssetDetailsForm
            id={asset.id}
            ai={asset.source === "ai_generated"}
            suggestAlt={aiConfigured() && ["image/jpeg", "image/png", "image/webp"].includes(asset.contentType)}
            value={{ title: asset.title, altText: asset.altText, tags: asset.tags, rights: asset.rights, rightsNote: asset.rightsNote, people: asset.people, licenceExpires: asset.licenceExpires }}
          />
        </Section>
      </div>
    </div>
  );
}
