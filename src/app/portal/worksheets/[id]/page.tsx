import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortalClient } from "@/lib/portal-guard";
import { getMyWorksheet } from "@/lib/queries/worksheets";
import { getTemplate } from "@/lib/forms/registry";
import { saveWorksheetAnswers } from "@/app/actions/worksheets";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { AnswersView } from "@/components/forms/AnswersView";
import { PrintButton } from "@/components/forms/PrintButton";
import { NotCrisisNotice } from "@/components/NotCrisisNotice";
import { fmtDateTime } from "@/components/forms/format";

export const metadata: Metadata = { title: "Worksheet", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A worksheet, in the client's own account.
 *
 * Saved as they go and private to them until they send it; read-only after,
 * so what their practitioner reads is what they sent. The crisis notice sits
 * at the foot of the page, because a worksheet about strong emotions is
 * exactly where someone might find they need it.
 */
export default async function PortalWorksheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const state = await requirePortalClient();

  const worksheet = await getMyWorksheet(state.clientId, id);
  if (!worksheet) notFound();
  const template = getTemplate(worksheet.templateKey, worksheet.templateVersion);
  if (!template) notFound();

  const open = worksheet.status === "assigned" || worksheet.status === "in_progress";

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "36px 20px 60px" }}>
      <Link href="/portal/worksheets" className="no-print" style={{ fontSize: 14, fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none" }}>
        ← Your worksheets
      </Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, flexWrap: "wrap", margin: "14px 0 8px" }}>
        <h1 style={{ margin: 0, fontSize: "clamp(22px,4.4vw,28px)", fontWeight: 800, color: "var(--navy)" }}>{template.title}</h1>
        <PrintButton label={open ? "Print a copy" : "Print my answers"} />
      </div>

      {worksheet.note && (
        <div className="card" style={{ padding: "14px 18px", margin: "10px 0 18px", borderLeft: "4px solid var(--teal)" }}>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: "var(--navy-soft)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            From your practitioner
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: 1.55, color: "var(--ink)" }}>{worksheet.note}</p>
        </div>
      )}

      {open ? (
        <FormRenderer
          template={template}
          initialAnswers={worksheet.answers}
          action={saveWorksheetAnswers}
          hidden={{ assignmentId: worksheet.id }}
          revision={worksheet.revision}
          buttons={[
            { intent: "save", label: "Save my progress" },
            {
              intent: "submit",
              label: "Send to my practitioner",
              primary: true,
              confirm: "Once sent, you won't be able to change your answers. Ready to send?",
            },
          ]}
          footerNote="Your answers are saved in your account only when you press Save or Send."
        />
      ) : (
        <>
          <p style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
            You sent this on {fmtDateTime(worksheet.submittedAt)}.{" "}
            {worksheet.status === "reviewed"
              ? "Your practitioner has read it."
              : "Your practitioner will read it and talk it through with you."}
          </p>
          <AnswersView template={template} answers={worksheet.answers} />
        </>
      )}

      <NotCrisisNotice style={{ marginTop: 28 }} />
    </div>
  );
}
