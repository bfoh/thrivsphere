import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorksheetForStaff } from "@/lib/queries/worksheets";
import { getGuide, getTemplate } from "@/lib/forms/registry";
import { recordWorksheetPrint, saveWorksheetAnswers } from "@/app/actions/worksheets";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { AnswersView } from "@/components/forms/AnswersView";
import { PrintButton } from "@/components/forms/PrintButton";
import { BackLink } from "@/components/admin/BackLink";
import { Section, Field } from "@/components/admin/RecordUI";
import { WorksheetStaffActions } from "@/components/admin/ResourceForms";
import { fmtDateTime } from "@/components/forms/format";
import { initialsOf, shortRef, WORKSHEET_STATUS_LABEL, type WorksheetStatus } from "@/lib/resources-rules";

export const metadata: Metadata = { title: "Worksheet", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function StaffWorksheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; assignmentId: string }>;
  searchParams: Promise<{ enter?: string }>;
}) {
  const { id, assignmentId } = await params;
  const { enter } = await searchParams;
  if (!UUID.test(id) || !UUID.test(assignmentId)) notFound();

  const data = await getWorksheetForStaff(assignmentId);
  if (!data || data.assignment.clientId !== id) notFound();
  const { assignment, client, names, clientStarted } = data;

  const template = getTemplate(assignment.templateKey, assignment.templateVersion);
  if (!template) notFound();

  const status = assignment.status as WorksheetStatus;
  const open = status === "assigned" || status === "in_progress";
  const sent = status === "submitted" || status === "reviewed";
  // Staff can enter answers with the client unless the client has started it themselves.
  const canEnter = open && !clientStarted;
  const entering = canEnter && (enter === "1" || status === "in_progress");
  const name = (uid: string | null) => (uid ? (names.get(uid) ?? "A former colleague") : "—");

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px 60px" }}>
      <BackLink href={`/admin/clients/${id}`} label={client.preferredName} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, flexWrap: "wrap", margin: "16px 0 6px" }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "var(--navy)" }}>{template.title}</h1>
        {sent && <PrintButton label="Print" onPrint={recordWorksheetPrint.bind(null, assignmentId)} />}
      </div>
      <p className="no-print" style={{ margin: "0 0 18px", fontSize: 14, color: "var(--navy-soft)" }}>
        {client.preferredName} · {WORKSHEET_STATUS_LABEL[status]}
      </p>

      <Section title="About this worksheet">
        <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
          <div className="print-only">
            <Field label="Client initials / ID" value={`${initialsOf(client.preferredName)} · ${shortRef(client.id)}`} />
          </div>
          <Field label="Set by" value={`${name(assignment.assignedBy)}, ${fmtDateTime(assignment.assignedAt)}`} />
          <Field label="Status" value={WORKSHEET_STATUS_LABEL[status]} />
          {assignment.submittedAt && (
            <Field label="Sent" value={`${fmtDateTime(assignment.submittedAt)} by ${name(assignment.submittedBy)}`} />
          )}
          {assignment.reviewedAt && (
            <Field label="Reviewed" value={`${fmtDateTime(assignment.reviewedAt)} by ${name(assignment.reviewedBy)}`} />
          )}
          {assignment.note && <Field label="Note shown to the client" value={assignment.note} />}
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <WorksheetStaffActions assignmentId={assignmentId} status={status} />
          {getGuide(assignment.templateKey) && (
            <Link href={`/admin/resources/worksheets/${assignment.templateKey}`} className="no-print" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--teal-deep)" }}>
              Practitioner guide
            </Link>
          )}
        </div>
      </Section>

      {sent && <AnswersView template={template} answers={assignment.answers} names={names} />}

      {open && clientStarted && (
        <Section title="In progress">
          <p style={{ margin: 0, fontSize: 14.5, color: "var(--ink)", lineHeight: 1.6 }}>
            The client has started this worksheet themselves. Their answers stay private to them until they send it, and will
            appear here when they do.
          </p>
        </Section>
      )}

      {canEnter && !entering && (
        <Section title="Not started yet">
          <p style={{ margin: "0 0 12px", fontSize: 14.5, color: "var(--ink)", lineHeight: 1.6 }}>
            The client can fill this in from their account. If you are going through it together — or they did it on paper —
            you can enter their answers here instead. The record will show that you entered them.
          </p>
          <Link href={`/admin/clients/${id}/worksheets/${assignmentId}?enter=1`} className="pill pill-teal" style={{ padding: "10px 20px", fontSize: 13.5 }}>
            Enter answers with the client
          </Link>
        </Section>
      )}

      {entering && (
        <>
          <p style={{ margin: "6px 0 14px", fontSize: 14, color: "var(--navy-soft)", lineHeight: 1.55 }}>
            Entering answers with the client. Use their words. Save as you go; send it when you have finished together.
          </p>
          <FormRenderer
            template={template}
            initialAnswers={assignment.answers}
            action={saveWorksheetAnswers}
            hidden={{ assignmentId }}
            revision={assignment.revision}
            buttons={[
              { intent: "save", label: "Save" },
              {
                intent: "submit",
                label: "Send",
                primary: true,
                confirm: "Once sent, the answers are fixed. Has the client agreed they're finished?",
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
