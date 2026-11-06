import type * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability } from "@/lib/guard";
import { Section, Empty } from "@/components/admin/RecordUI";
import { StartSheetPicker, TaskDoneButton } from "@/components/admin/ResourceForms";
import { listClientsForPicker, listOpenTasksFor, listRecentSupervision } from "@/lib/queries/supervision";
import { listWorksheetsAwaitingReview } from "@/lib/queries/worksheets";
import { getTemplate, worksheetLibrary } from "@/lib/forms/registry";
import { worksheetLabel } from "@/lib/forms/library";
import { fmtDate, fmtDateTime, londonToday } from "@/components/forms/format";

export const metadata: Metadata = { title: "Resources", robots: { index: false, follow: false } };

/**
 * Resources: everything staff use to plan and support a client's work
 * between sessions — supervision sheets, the preparation tasks they create,
 * and the worksheet library — with what needs attention first.
 */
export default async function ResourcesPage() {
  const actor = await requireCapability("worksheet:manage", {
    entity: "resources",
    action: "view",
    detail: "opened resources",
  });

  const [tasks, toReview, recent, clients] = await Promise.all([
    listOpenTasksFor(actor.userId),
    listWorksheetsAwaitingReview(),
    listRecentSupervision(),
    listClientsForPicker(),
  ]);
  const library = worksheetLibrary();
  const today = londonToday();

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px 80px" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 800, color: "var(--navy)" }}>Resources</h1>
      <p style={{ margin: "0 0 24px", fontSize: 14.5, color: "var(--navy-soft)", maxWidth: 680, lineHeight: 1.55 }}>
        Supervision &amp; next-session planning, your preparation tasks, and the worksheets you can set for clients.
        Everything here is part of the client&apos;s record and every access is logged.
      </p>

      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>
        <Section title="Start a supervision sheet" subtitle="Review a completed session and plan the next one">
          <StartSheetPicker clients={clients.map((c) => ({ id: c.id, name: c.preferredName }))} />
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--navy-soft)", lineHeight: 1.5 }}>
            You can also start one from a completed session under{" "}
            <Link href="/admin/appointments" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
              Appointments
            </Link>
            . Prefer paper?{" "}
            <Link href="/admin/resources/supervision" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
              Print a blank sheet
            </Link>
            .
          </p>
        </Section>

        <Section title="My preparation tasks" subtitle={`${tasks.length} open`}>
          {tasks.length === 0 ? (
            <Empty>Nothing waiting on you.</Empty>
          ) : (
            <ul style={list}>
              {tasks.map((t) => (
                <li key={t.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.5, flex: "1 1 220px" }}>
                    {t.description}
                    <br />
                    <Link href={`/admin/clients/${t.clientId}/supervision/${t.recordId}`} style={subLink}>
                      {t.clientName}
                    </Link>
                    {t.dueBy && (
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: t.dueBy < today ? "#a1421c" : "var(--navy-soft)" }}>
                        {" "}
                        · by {fmtDate(t.dueBy)}
                        {t.dueBy < today ? " (overdue)" : ""}
                      </span>
                    )}
                  </span>
                  <TaskDoneButton taskId={t.id} done={false} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Worksheets awaiting review" subtitle={`${toReview.length} sent back by clients`}>
        {toReview.length === 0 ? (
          <Empty>No worksheets waiting.</Empty>
        ) : (
          <ul style={list}>
            {toReview.map((w) => (
              <li key={w.id} style={{ fontSize: 14, color: "var(--ink)" }}>
                <Link href={`/admin/clients/${w.clientId}/worksheets/${w.id}`} style={{ fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none" }}>
                  {w.clientName}
                </Link>{" "}
                — {getTemplate(w.templateKey, w.templateVersion)?.title ?? w.templateKey}
                <span style={{ color: "var(--navy-soft)" }}> · sent {fmtDateTime(w.submittedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Recent supervision sheets" subtitle="Drafts first">
        {recent.length === 0 ? (
          <Empty>No sheets yet.</Empty>
        ) : (
          <ul style={list}>
            {recent.map((r) => (
              <li key={r.id} style={{ fontSize: 14, color: "var(--ink)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <StatusChip status={r.status} />
                <Link href={`/admin/clients/${r.clientId}/supervision/${r.id}`} style={{ fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none" }}>
                  {r.clientName}
                </Link>
                <span style={{ color: "var(--navy-soft)" }}>supervision {fmtDate(r.supervisionDate)}</span>
                {r.needsFollowUp && <span style={flagChip}>Section 3 flag</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Worksheet library" subtitle="Set one from a client's record">
        <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {library.map((w) => (
            <div key={w.key} style={{ border: "1px solid rgba(31,58,95,0.12)", borderRadius: 12, padding: "16px 18px" }}>
              <h3 style={{ margin: "0 0 6px", fontSize: 15.5, fontWeight: 800, color: "var(--navy)" }}>{worksheetLabel(w)}</h3>
              <p style={{ margin: "0 0 10px", fontSize: 13.5, color: "var(--ink)", lineHeight: 1.5 }}>{w.template.summary}</p>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {w.hasGuide && (
                  <Link href={`/admin/resources/worksheets/${w.key}`} style={subLink}>
                    Practitioner guide
                  </Link>
                )}
                <Link href={`/admin/resources/worksheets/${w.key}/print`} style={subLink}>
                  Printable copy
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const draft = status === "draft";
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 800,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        padding: "3px 8px",
        borderRadius: 999,
        background: draft ? "rgba(212,175,55,0.18)" : "rgba(61,138,138,0.14)",
        color: draft ? "#7a5c0c" : "var(--teal-deep)",
      }}
    >
      {draft ? "Draft" : "Final"}
    </span>
  );
}

const list: React.CSSProperties = { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 };
const subLink: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none" };
const flagChip: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 800,
  padding: "3px 8px",
  borderRadius: 999,
  background: "#c853241a",
  color: "#8c2a1c",
};
