import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability } from "@/lib/guard";
import { getKitHistory, getKitVersion } from "@/lib/queries/marketing";
import { kitFormValues, seedKit } from "@/lib/brand-kit";
import { KitEditor } from "@/components/admin/marketing/KitForms";
import { h1 } from "@/components/admin/marketing/ui";

export const metadata: Metadata = { title: "Edit brand kit", robots: { index: false, follow: false } };

/** Edit a copy of the newest version. Saving makes a new version for Patience to approve. */
export default async function EditBrandKitPage() {
  await requireCapability("brand:manage", { entity: "brand_kit_versions", action: "view", detail: "opened the Brand Kit editor" });
  const { status } = await getKitHistory();
  const latest = status.latest ? await getKitVersion(status.latest.id) : null;
  return (
    <div className="adm-page adm-page--narrow">
      <Link href="/admin/marketing/brand" style={{ fontSize: 13, fontWeight: 700 }}>← Brand kit</Link>
      <h1 className="adm-title" style={{ ...h1, marginTop: 10 }}>Edit the brand kit</h1>
      <KitEditor values={kitFormValues(latest?.content ?? seedKit())} basedOn={latest ? `version ${latest.number}` : "the website's wording"} />
    </div>
  );
}
