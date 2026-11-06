import type * as React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupervisionRecord, listSessionsForSheet } from "@/lib/queries/supervision";
import { getActiveStaff } from "@/lib/queries/availability";
import { getTemplate } from "@/lib/forms/registry";
import { supervisionHeaderFields, SUPERVISION_BUTTONS } from "@/lib/supervision-form";
import { recordSupervisionPrint, saveSupervisionRecord } from "@/app/actions/supervision";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { AnswersView } from "@/components/forms/AnswersView";
import { PrintButton } from "@/components/forms/PrintButton";
import { BackLink } from "@/components/admin/BackLink";
import { Section, Field, Empty } from "@/components/admin/RecordUI";
import { AmendSupervisionForm, DeleteDraftButton, TaskDoneButton } from "@/components/admin/ResourceForms";
import { fmtDate, fmtDateTime } from "@/components/forms/format";
import { initialsOf, shortRef } from "@/lib/resources-rules";
import { getCurrentActor } from "@/lib/session";
import { can } from "@/lib/authz";

export const metadata: Metadata = { title: "Supervision sheet", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SupervisionSheetPage({
  params,
}: {
  params: Promise<{ id: string; recordId: string }>;
}) {
  const { id, recordId } = await params;
  if (!UUID.test(id) || !UUID.test(recordId)) notFound();

  const data = await getSupervisionRecord(recordId);
  if (!data || data.record.clientId !== id) notFound();
  const { record, client, appointment, amendments, tasks, names } = data;

  const template = getTemplate(record.templateKey, record.templateVersion);
  if (!template) notFound();

  const actor = await getCurrentActor();
  const canAmend = can(actor, "notes:amend");
  const name = (uid: string | null) => (uid ? (names.get(uid) ?? "A former colleague") : "—");

  if (record.status === "draft") {
    const [sessions, staff] = await Promise.all([listSessionsForSheet(id), getActiveStaff()]);
    const staffList = staff.map((s) => ({ id: s.id, name: s.name }));
    return (
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px 40px" }}>
        <BackLink href={`/admin/clients/${id}`} label={client.preferredName} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, flexWrap: "wrap", margin: "16px 0 4px" }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "var(--navy)" }}>{template.title}</h1>
          <span style={draftChip}>Draft</span>
        </div>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--navy-soft)" }}>
          {client.preferredName} · started by {name(record.createdBy)} {fmtDateTime(record.createdAt)} · last saved by{" "}
          {name(record.updatedBy)} {fmtDateTime(record.updatedAt)}
        </p>

        <FormRenderer
          template={template}
          initialAnswers={record.answers}
          action={saveSupervisionRecord}
          hidden={{ clientId: id, recordId }}
          revision={record.revision}
          staff={staffList}
          clientId={id}
          headerTitle="About this session"
          headerFields={supervisionHeaderFields({
            sessions:
              appointment && !sessions.some((s) => s.id === appointment.id)
                ? [{ ...appointment, practitionerId: record.practitionerId }, ...sessions]
                : sessions,
            staff: staffList,
            appointmentId: record.appointmentId,
            practitionerId: record.practitionerId,
            supervisionDate: record.supervisionDate,
          })}
          buttons={SUPERVISION_BUTTONS}
        />
        <div style={{ marginTop: 18 }}>
          <DeleteDraftButton recordId={recordId} />
        </div>
      </div>
    );
  }

  const openTasks = tasks.filter((t) => !t.doneAt).length;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px 80px" }}>
      <BackLink href={`/admin/clients/${id}`} label={client.preferredName} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, flexWrap: "wrap", margin: "16px 0 6px" }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "var(--navy)" }}>{template.title}</h1>
        <PrintButton label="Print" onPrint={recordSupervisionPrint.bind(null, recordId)} />
      </div>

      {/* On screen the client is named; on paper only initials and a reference. */}
      <p className="no-print" style={{ margin: "0 0 18px", fontSize: 14, color: "var(--navy-soft)" }}>
        {client.preferredName} · finalised by {name(record.finalisedBy)} {fmtDateTime(record.finalisedAt)} · locked
      </p>

      <Section title="About this session">
        <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
          <div className="print-only">
            <Field label="Client initials / ID" value={`${initialsOf(client.preferredName)} · ${shortRef(client.id)}`} />
          </div>
          <Field label="Session completed" value={appointment ? fmtDateTime(appointment.startsAt) : "Not linked to a session"} />
          <Field label="Practitioner" value={name(record.practitionerId)} />
          <Field label="Supervision date" value={fmtDate(record.supervisionDate)} />
          <Field label="Sheet reference" value={shortRef(record.id)} />
        </div>
        {record.needsFollowUp && (
          <p role="note" style={{ margin: "14px 0 0", fontSize: 14, fontWeight: 700, color: "#8c2a1c" }}>
            Section 3 flags a risk, signposting or scope question.
          </p>
        )}
      </Section>

      <AnswersView template={template} answers={record.answers} names={names} />

      <Section title="Preparation tasks" subtitle={tasks.length ? `${openTasks} of ${tasks.length} still open` : undefined}>
        {tasks.length === 0 ? (
          <Empty>No preparation tasks were set.</Empty>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
            {tasks.map((t) => (
              <li key={t.id} style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
                <span style={{ fontSize: 14.5, color: "var(--ink)", lineHeight: 1.5, flex: "1 1 260px" }}>
                  {t.description}
                  <span style={{ display: "block", fontSize: 12.5, color: "var(--navy-soft)" }}>
                    {name(t.assigneeId)}
                    {t.dueBy ? ` · by ${fmtDate(t.dueBy)}` : ""}
                    {t.doneAt ? ` · done by ${name(t.doneBy)} ${fmtDate(t.doneAt)}` : ""}
                  </span>
                </span>
                <TaskDoneButton taskId={t.id} done={!!t.doneAt} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Amendments" subtitle="Corrections added after finalising. The sheet above is unchanged.">
        {amendments.length === 0 ? (
          <Empty>No amendments.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
            {amendments.map((a) => (
              <div key={a.id} style={{ paddingLeft: 14, borderLeft: "3px solid rgba(212,175,55,0.5)" }}>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: "var(--ink)", whiteSpace: "pre-wrap" }}>{a.body}</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--navy-soft)" }}>
                  {name(a.authorId)} · {a.reason} · {fmtDateTime(a.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: amendments.length ? 0 : 12 }}>
          {canAmend ? (
            <AmendSupervisionForm recordId={recordId} />
          ) : (
            <p className="no-print" style={{ margin: 0, fontSize: 13, color: "var(--navy-soft)" }}>
              Spotted a mistake? A supervisor can add an amendment.
            </p>
          )}
        </div>
      </Section>
    </div>
  );
}

const draftChip: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  padding: "4px 10px",
  borderRadius: 999,
  background: "rgba(212,175,55,0.18)",
  color: "#7a5c0c",
};
