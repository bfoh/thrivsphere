import type { Metadata } from "next";
import { requireCapability } from "@/lib/guard";
import { supervisionTemplate } from "@/lib/forms/registry";
import { AnswersView } from "@/components/forms/AnswersView";
import { PrintButton } from "@/components/forms/PrintButton";
import { BackLink } from "@/components/admin/BackLink";

export const metadata: Metadata = { title: "Supervision sheet — blank", robots: { index: false, follow: false } };

/**
 * A blank supervision sheet for paper use.
 *
 * Paper is a fallback, not a second system: what is written on it should be
 * typed into a sheet on the client's record afterwards, which is where it is
 * protected and where colleagues will look for it.
 */
export default async function BlankSupervisionSheetPage() {
  await requireCapability("supervision:read", {
    entity: "resources",
    action: "view",
    detail: "opened the blank supervision sheet",
  });
  const template = supervisionTemplate();

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px 80px" }}>
      <BackLink href="/admin/resources" label="Resources" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, flexWrap: "wrap", margin: "16px 0 6px" }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "var(--navy)" }}>{template.title}</h1>
        <PrintButton label="Print blank sheet" />
      </div>
      <p className="no-print" style={{ margin: "0 0 20px", fontSize: 14, color: "var(--navy-soft)", lineHeight: 1.55 }}>
        For when a screen isn&apos;t practical. Type it into a sheet on the client&apos;s record afterwards, and shred the paper
        copy — a loose sheet is the easiest way for a record to go astray.
      </p>
      <div className="print-only" style={{ marginBottom: 14, fontSize: 13.5, lineHeight: 1.9 }}>
        <strong style={{ fontSize: 16 }}>THRIVESPHERE — {template.title}</strong>
        <br />
        Client initials / ID: ____________________ &nbsp; Session completed: ____________________
        <br />
        Practitioner: ____________________ &nbsp; Supervision date: ____________________
      </div>
      <AnswersView template={template} answers={{}} mode="blank" />
    </div>
  );
}
