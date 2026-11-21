import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability } from "@/lib/guard";
import { can } from "@/lib/authz";
import { Section } from "@/components/admin/RecordUI";
import { getKitHistory, getKitVersion } from "@/lib/queries/marketing";
import { canApproveKit, changedSections, seedKit } from "@/lib/brand-kit";
import { KitView } from "@/components/admin/marketing/KitView";
import { ApproveKitForm, StartKitButton } from "@/components/admin/marketing/KitForms";
import { h1, lead, page } from "@/components/admin/marketing/ui";

export const metadata: Metadata = { title: "Brand kit", robots: { index: false, follow: false } };

const dt = (v: Date) => v.toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * The Brand Kit: how ThriveSphere looks and sounds. Admins edit a draft; the
 * founder approves the exact version that everything else then uses.
 */
export default async function BrandKitPage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const actor = await requireCapability("marketing:write", { entity: "brand_kit_versions", action: "view", detail: "viewed the Brand Kit" });
  const { v } = await searchParams;
  const { versions, approvals, status } = await getKitHistory();
  const editor = can(actor, "brand:manage");

  // Which version to show: one asked for, else the waiting draft, else the approved one.
  const shownId = (v && versions.some((x) => x.id === v) ? v : null) ?? status.draft?.id ?? status.approved?.id ?? null;
  const [shown, approvedRow] = await Promise.all([shownId ? getKitVersion(shownId) : null, status.approved ? getKitVersion(status.approved.id) : null]);
  const kit = shown?.content ?? seedKit();
  const isDraft = !!shown && shown.id === status.draft?.id;
  const approvalOf = (id: string) => approvals.find((a) => a.versionId === id && versions.find((x) => x.id === id)?.contentHash === a.contentHash);

  return (
    <div style={page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={h1}>Brand kit</h1>
          <p style={lead}>
            How ThriveSphere looks and sounds. Every graphic, post and AI suggestion follows the approved version.
            {editor ? " You can edit it; Patience approves each new version." : " Admins edit it and Patience approves it."}
          </p>
        </div>
        {editor && versions.length > 0 && (
          <Link href="/admin/marketing/brand/edit" className="pill pill-gold" style={{ padding: "10px 20px", fontSize: 13.5 }}>
            Edit the brand kit
          </Link>
        )}
      </div>

      {versions.length === 0 ? (
        <Section title="Not started yet" subtitle="Until the first version is approved, the website's own wording stands in. It is shown below.">
          {editor ? <StartKitButton /> : <p style={{ margin: 0, fontSize: 14 }}>An admin or Patience can start it.</p>}
        </Section>
      ) : (
        <div className="card" style={{ padding: "16px 20px", marginBottom: 18, borderLeft: `4px solid ${isDraft ? "var(--gold)" : "var(--teal)"}` }}>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6 }}>
            <strong style={{ color: "var(--navy)" }}>Showing version {shown?.number}</strong>
            {isDraft ? " — waiting for Patience's approval." : approvalOf(shown!.id) ? ` — approved ${dt(approvalOf(shown!.id)!.approvedAt)}${approvalOf(shown!.id)!.approvedByName ? ` by ${approvalOf(shown!.id)!.approvedByName}` : ""}.` : " — not approved."}
            {status.approved && shown?.id !== status.approved.id && <> The hub uses <Link href={`/admin/marketing/brand?v=${status.approved.id}`}>version {status.approved.number}</Link> until then.</>}
            {!status.approved && " Nothing is approved yet, so the website's wording is used."}
          </p>
          {isDraft && (
            <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "var(--navy-soft)" }}>
              Changed since the approved version: {changedSections(approvedRow?.content ?? null, kit).join(", ") || "nothing"}.
              {shown?.note && <> Note: &ldquo;{shown.note}&rdquo;</>}
            </p>
          )}
        </div>
      )}

      {isDraft && canApproveKit(actor) && shown && (
        <Section title={`Approve version ${shown.number}`} subtitle="Read it all below first. Approving makes it the version everything uses.">
          <ApproveKitForm versionId={shown.id} contentHash={shown.contentHash} number={shown.number} />
        </Section>
      )}

      <KitView kit={kit} />

      {versions.length > 0 && (
        <Section title="History">
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.8 }}>
            {versions.map((x) => {
              const a = approvalOf(x.id);
              return (
                <li key={x.id}>
                  <Link href={`/admin/marketing/brand?v=${x.id}`}>Version {x.number}</Link>, saved {dt(x.createdAt)}
                  {x.createdByName ? ` by ${x.createdByName}` : ""}
                  {a ? `; approved ${dt(a.approvedAt)}` : ""}
                  {x.note ? ` — ${x.note}` : ""}
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </div>
  );
}
