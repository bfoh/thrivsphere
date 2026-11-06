import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/guard";
import { worksheetTemplate } from "@/lib/forms/registry";
import { AnswersView } from "@/components/forms/AnswersView";
import { PrintButton } from "@/components/forms/PrintButton";
import { BackLink } from "@/components/admin/BackLink";

export const metadata: Metadata = { title: "Printable worksheet", robots: { index: false, follow: false } };

/** The client's worksheet as a blank paper copy, for clients who prefer paper. */
export default async function PrintableWorksheetPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  await requireCapability("worksheet:manage", {
    entity: "resources",
    action: "view",
    detail: `opened the printable copy of ${key}`,
  });
  const template = worksheetTemplate(key);
  if (!template) notFound();

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 24px 80px" }}>
      <BackLink href="/admin/resources" label="Resources" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, flexWrap: "wrap", margin: "16px 0 6px" }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "var(--navy)" }}>{template.title}</h1>
        <PrintButton label="Print" />
      </div>
      <p className="no-print" style={{ margin: "0 0 20px", fontSize: 14, color: "var(--navy-soft)", lineHeight: 1.55 }}>
        This is what the client sees. If they complete it on paper, type their answers in from their record (open the
        worksheet and choose &ldquo;Enter answers with the client&rdquo;) so it is kept with the rest of their record.
      </p>
      <p className="print-only" style={{ margin: "0 0 12px", fontSize: 12, letterSpacing: "0.12em", fontWeight: 800 }}>
        THRIVESPHERE WELLBEING
      </p>
      <AnswersView template={template} answers={{}} mode="blank" />
      <p className="print-only" style={{ marginTop: 18, fontSize: 12.5, lineHeight: 1.6 }}>
        ThriveSphere is not an emergency or crisis service. If you need help right now: emergency 999 · NHS 111, option 2 ·
        Samaritans 116 123 (free, 24/7) · text SHOUT to 85258.
      </p>
    </div>
  );
}
