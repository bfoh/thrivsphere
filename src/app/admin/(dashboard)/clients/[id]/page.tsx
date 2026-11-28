import type * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientRecord } from "@/lib/queries/clients";
import { SafeguardingRecord } from "@/components/admin/SafeguardingRecord";
import { CONCERN_TYPES, IMMEDIATE_THREAT, canStandDownFlag, labelFor, labelsFor } from "@/lib/safeguarding-rules";
import { isSafeguardingDeputy, listPractitionerChoices, staffNames } from "@/lib/queries/safeguarding";
import { Section, Field, Empty } from "@/components/admin/RecordUI";
import { NoteForm } from "@/components/admin/NoteForm";
import {
  AmendNoteForm,
  ClearFlagButton,
  CloseConcernForm,
  RaiseConcernForm,
  ReferralForm,
} from "@/components/admin/SafeguardingForms";
import { UploadDocumentForm, DeleteDocumentButton } from "@/components/admin/DocumentForms";
import { MessageThread } from "@/components/MessageThread";
import { getConversation } from "@/app/actions/messages";
import { Icon } from "@/components/icons";
import { AssignWorksheetForm } from "@/components/admin/ResourceForms";
import { getTemplate, worksheetLibrary } from "@/lib/forms/registry";
import { worksheetLabel } from "@/lib/forms/library";
import { listSessionsForSheet } from "@/lib/queries/supervision";
import { WORKSHEET_STATUS_LABEL, type WorksheetStatus } from "@/lib/resources-rules";
import { SuitabilityForm } from "@/components/admin/SuitabilityForm";
import { outcomeLabel, sessionGate } from "@/lib/suitability-rules";
import { kindLabel } from "@/lib/allocation";
import { getCurrentActor } from "@/lib/session";
import { can } from "@/lib/authz";
import { ConcessionForm, EndDiscountButton, FreeSessionsForm } from "@/components/admin/DiscountForms";
import { getActiveConcession, listClientDiscountHistory, planPrices } from "@/lib/queries/discounts";
import { describeDiscount, penceLabel, reasonLabel } from "@/lib/discounts";
import { maySeeEmergencyContact } from "@/lib/queries/emergency-contact";
import { answerLabel, contactLines, methodLabel } from "@/lib/emergency-contact";
import { recordAudit } from "@/lib/audit";
import { Badge, CLIENT_STATUS_TONE, statusText, type Tone } from "@/components/admin/ui";
import { RecordNav } from "@/components/admin/RecordNav";
import { clock, LDN } from "@/lib/dashboard";

export const metadata: Metadata = {
  title: "Client record",
  robots: { index: false, follow: false },
};

const dt = (d: Date | string | null) =>
  d
    ? new Date(d).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const chip = (draft: boolean): React.CSSProperties => ({
  fontSize: 11.5,
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  padding: "3px 8px",
  borderRadius: 999,
  background: draft ? "rgba(212,175,55,0.18)" : "rgba(61,138,138,0.14)",
  color: draft ? "#7a5c0c" : "var(--teal-deep)",
});

const OUTCOME_COLOUR: Record<string, string> = {
  suitable: "var(--teal-deep)",
  clarification: "#8a6d12",
  not_suitable: "#8c2a1c",
};

const d = (v: Date | string | null) =>
  v ? new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default async function ClientRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getClientRecord(id);
  if (!record) notFound();

  const [conversation, sessionsForWorksheet, actor] = await Promise.all([
    getConversation(id),
    listSessionsForSheet(id),
    getCurrentActor(),
  ]);

  const {
    client,
    intake,
    riskFlags,
    concerns,
    notes,
    appointments,
    packages,
    consents,
    referrals,
    documents,
    supervision,
    worksheets,
    decisions,
  } = record;
  const [decision, ...earlierDecisions] = decisions;

  // Safeguarding records: who may stand a flag down, and the names on each record.
  const [practitioners, names, deputy, seeContact] = await Promise.all([
    listPractitionerChoices(),
    staffNames(concerns.flatMap((c) => [c.practitionerId, c.raisedBy, c.closedBy])),
    actor ? isSafeguardingDeputy(actor.userId) : Promise.resolve(false),
    actor ? maySeeEmergencyContact(actor, id) : Promise.resolve(false),
  ]);
  // Emergency Contact / Next of Kin (IT handover §15.4): only the Lead, the
  // Deputy and the client's practitioners see it, and each showing is logged.
  const ec = {
    status: client.emergencyContactStatus,
    name: client.emergencyContactName,
    relationship: client.emergencyContactRelationship,
    phone: client.emergencyContactPhone,
    alt: client.emergencyContactAlt,
    country: client.emergencyContactCountry,
    timeZone: client.emergencyContactTimeZone,
    method: client.emergencyContactMethod,
    methodOther: client.emergencyContactMethodOther,
  };
  if (seeContact && actor && ec.status === "provided") {
    await recordAudit({
      actorId: actor.userId,
      action: "view",
      entity: "clients",
      entityId: id,
      subjectClientId: id,
      detail: "emergency contact shown",
    });
  }
  const canStandDown = !!actor && canStandDownFlag({ role: actor.role, safeguardingDeputy: deputy });
  const me = actor ? (practitioners.find((p) => p.id === actor.userId) ?? null) : null;
  const canDecide = !!actor && can(actor, "notes:write");

  // Prices and discounts are for the founder and admins only.
  const canDiscount = !!actor && can(actor, "discount:manage");
  const [concession, discountHistory, plans] = canDiscount
    ? await Promise.all([getActiveConcession(id), listClientDiscountHistory(id), planPrices()])
    : [null, [], []];
  const concessionPlans = (slugs: string[] | null) =>
    slugs ? slugs.map((s) => plans.find((p) => p.slug === s)?.name ?? s).join(", ") : "everything";

  const library = worksheetLibrary().map((w) => ({ key: w.key, label: worksheetLabel(w) }));
  const pastSessions = sessionsForWorksheet.slice(0, 20).map((a) => ({ id: a.id, label: dt(a.startsAt) }));

  const answers = (intake?.answers ?? {}) as Record<string, unknown>;

  // The summary at the top. One clock reading, taken before rendering.
  const now = new Date();
  const nextAppt = appointments
    .filter((a) => a.status === "scheduled" && new Date(a.startsAt) >= now)
    .sort((x, y) => new Date(x.startsAt).getTime() - new Date(y.startsAt).getTime())[0];
  const openConcerns = concerns.filter((c) => c.status !== "closed").length;
  const OUTCOME_TONE: Record<string, Tone> = { suitable: "ok", clarification: "warn", not_suitable: "danger" };

  const sections = [
    { id: "outcome", label: "Overview" },
    { id: "notes", label: "Notes" },
    { id: "supervision", label: "Supervision" },
    { id: "worksheets", label: "Worksheets" },
    { id: "safeguarding", label: "Safeguarding" },
    { id: "sessions", label: "Sessions" },
    ...(canDiscount ? [{ id: "discounts", label: "Discounts" }] : []),
    { id: "consent", label: "Documents & consent" },
    { id: "messages", label: "Messages" },
  ];
  const remaining = packages
    .filter((p) => p.status === "active")
    .reduce((n, p) => n + (p.sessionsTotal - p.sessionsUsed), 0);

  return (
    <div className="adm-page adm-record">
      <Link
        href="/admin/clients"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "var(--teal-deep)", fontWeight: 700, textDecoration: "none" }}
      >
        <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
          <Icon name="arrow" size={15} stroke="var(--teal-deep)" />
        </span>
        All clients
      </Link>

      {/*
        Risk comes first, above the name and everything else. A practitioner
        needs to see a flag before the session starts, not find it by scrolling
        into the history.
      */}
      {riskFlags.length > 0 && (
        <div
          role="alert"
          style={{
            marginTop: 16,
            border: "2px solid #c8532466",
            background: "#c853240d",
            borderRadius: 14,
            padding: "16px 20px",
          }}
        >
          <h2 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: "#8c2a1c", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Safeguarding flag
          </h2>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {riskFlags.map((f) => (
              <li key={f.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.5, flex: "1 1 320px" }}>
                  {f.summary}.{" "}
                  {f.concernId && (
                    <a href={`#concern-${f.concernId}`} style={{ color: "var(--teal-deep)", fontWeight: 700 }}>Read the record</a>
                  )}
                </span>
                <span style={{ fontSize: 12, color: "var(--navy-soft)" }}>raised {d(f.raisedAt)}</span>
                {canStandDown ? (
                  <ClearFlagButton flagId={f.id} clientId={client.id} />
                ) : (
                  <span style={{ fontSize: 12, color: "var(--navy-soft)" }}>The Safeguarding Lead or Deputy stands this down.</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <header className="adm-record-head">
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 className="adm-title">{client.preferredName}</h1>
            <Badge tone={CLIENT_STATUS_TONE[client.status] ?? "neutral"}>{statusText(client.status)}</Badge>
          </div>
          <p style={{ margin: "6px 0 0", color: "var(--navy-soft)" }}>
            {client.email} · registered {d(client.createdAt)}
          </p>
        </div>
        <div className="adm-head-actions">
          <a href="#notes" className="pill pill-teal" style={{ minHeight: 38, padding: "0 16px", fontSize: 13.5 }}>
            Add a note
          </a>
          <a href="#messages" className="pill pill-ghost" style={{ minHeight: 38, padding: "0 16px", fontSize: 13.5 }}>
            Message
          </a>
        </div>
      </header>

      <dl className="adm-summary">
        <div>
          <dt>Consultation outcome</dt>
          <dd>
            {decision ? (
              <Badge tone={OUTCOME_TONE[decision.outcome] ?? "neutral"}>{outcomeLabel(decision.outcome)}</Badge>
            ) : (
              <a href="#outcome" style={{ color: "var(--a-warn)", fontWeight: 700 }}>Not recorded yet</a>
            )}
          </dd>
        </div>
        <div>
          <dt>Next appointment</dt>
          <dd>
            {nextAppt ? (
              <>
                {new Date(nextAppt.startsAt).toLocaleDateString("en-GB", { timeZone: LDN, weekday: "short", day: "numeric", month: "short" })},{" "}
                {clock(new Date(nextAppt.startsAt))}
                <span className="adm-summary-sub">{kindLabel(nextAppt.kind)}</span>
              </>
            ) : (
              <span style={{ color: "var(--navy-soft)" }}>None booked</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Sessions left</dt>
          <dd>
            {remaining}
            <span className="adm-summary-sub">in active packages</span>
          </dd>
        </div>
        <div>
          <dt>Safeguarding</dt>
          <dd>
            {riskFlags.length > 0 ? (
              <Badge tone="danger">Flag raised</Badge>
            ) : openConcerns > 0 ? (
              <a href="#safeguarding" style={{ color: "var(--a-warn)", fontWeight: 700 }}>
                {openConcerns} open {openConcerns === 1 ? "concern" : "concerns"}
              </a>
            ) : (
              <span style={{ color: "var(--navy-soft)" }}>No flag</span>
            )}
          </dd>
        </div>
      </dl>

      <RecordNav items={sections} />

      {/* consultation outcome (IT handover §13.1) */}
      <Section
        id="outcome"
        title="Consultation outcome"
        subtitle={sessionGate(decision?.outcome ?? null).open ? "Ongoing sessions are open" : "Ongoing sessions are closed until the outcome is Suitable"}
      >
        {decision ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ margin: 0, fontSize: 15, color: "var(--ink)" }}>
              <strong style={{ color: OUTCOME_COLOUR[decision.outcome] ?? "var(--navy)" }}>{outcomeLabel(decision.outcome)}</strong>
              <span style={{ fontSize: 12.5, color: "var(--navy-soft)" }}>
                {" "}
                · {dt(decision.decidedAt)} · {decision.deciderName || decision.deciderEmail}
              </span>
            </p>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--ink)", whiteSpace: "pre-wrap" }}>{decision.rationale}</p>
            {decision.signpostedTo && (
              <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink)" }}>
                Signposted to <strong>{decision.signpostedTo}</strong>
              </p>
            )}
            {earlierDecisions.length > 0 && (
              <details style={{ marginTop: 6 }}>
                <summary style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "var(--teal-deep)" }}>
                  Earlier decisions ({earlierDecisions.length})
                </summary>
                <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {earlierDecisions.map((e) => (
                    <li key={e.id} style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink)" }}>
                      <strong>{outcomeLabel(e.outcome)}</strong>
                      <span style={{ color: "var(--navy-soft)" }}> · {dt(e.decidedAt)} · {e.deciderName || e.deciderEmail}</span>
                      <br />
                      {e.rationale}
                      {e.signpostedTo && ` (signposted to ${e.signpostedTo})`}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ) : (
          <Empty>
            No decision yet. Record it in or after the Initial Wellbeing Consultation; ongoing sessions stay closed
            until it is Suitable.
          </Empty>
        )}
        {canDecide && <SuitabilityForm clientId={client.id} hasDecision={!!decision} />}
      </Section>

      {/* contact + safety */}
      <Section title="Contact & safety">
        <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 28px" }}>
          <Field label="Preferred name" value={client.preferredName} />
          <Field label="Pronouns" value={client.pronouns} />
          <Field label="Email" value={client.email} />
          <Field label="Phone" value={client.phone} />
          <Field
            label="Safe to call / leave voicemail"
            value={client.safeToContactByPhone ? "Yes" : "No — do not leave messages"}
            emphasis={!client.safeToContactByPhone}
          />
          <Field label="Date of birth" value={d(client.dateOfBirth)} />
          <Field label="GP practice" value={client.gpPractice} />
          <Field label="18+ confirmed" value={client.confirmedAdult ? dt(client.confirmedAdultAt) : "Not confirmed"} />
        </div>
        {client.contactNotes && (
          <div style={{ marginTop: 14 }}>
            <Field label="Contact notes" value={client.contactNotes} />
          </div>
        )}
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(31,58,95,0.08)" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14.5, color: "var(--navy)" }}>Emergency Contact / Next of Kin</h3>
          {!seeContact ? (
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "var(--navy-soft)" }}>
              Only the Safeguarding Lead, the Deputy Safeguarding Lead and this client&apos;s practitioners can see this.
            </p>
          ) : ec.status !== "provided" ? (
            <Field label="The client's answer" value={answerLabel(ec.status)} />
          ) : (
            <>
              <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 28px" }}>
                <Field label="Full name" value={ec.name} />
                <Field label="Relationship to client" value={ec.relationship} />
                <Field label="Phone" value={ec.phone} />
                <Field label="Alternative phone or email" value={ec.alt} />
                <Field label="Country" value={ec.country} />
                <Field label="Time zone" value={ec.timeZone} />
                <Field label="Preferred contact method" value={methodLabel(ec.method, ec.methodOther)} />
                <Field
                  label="Client has told them"
                  value={client.emergencyContactInformed ? "Yes, where practicable" : "Not confirmed"}
                />
              </div>
              <p style={{ margin: "12px 0 0", fontSize: 12.5, lineHeight: 1.55, color: "var(--navy-soft)" }}>
                Only for a serious concern for the client&apos;s immediate safety, where appropriate and lawful; never
                routine updates. Record any contact in a Safeguarding Incident / Concern Record.
                {client.emergencyContactUpdatedAt ? ` Updated ${dt(client.emergencyContactUpdatedAt)}.` : ""}
              </p>
            </>
          )}
        </div>
      </Section>

      {/* intake */}
      <Section title="Intake" subtitle={intake ? `${intake.formVersion} · submitted ${dt(intake.submittedAt)}` : undefined}>
        {!intake ? (
          <Empty>No intake submitted yet.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="What brings them here" value={intake.presentingConcern} />
            <Field
              label="Areas selected"
              value={
                Array.isArray(answers.supportAreas) && answers.supportAreas.length
                  ? (answers.supportAreas as string[]).join(" · ")
                  : null
              }
            />
            <Field label="What they'd like to be different" value={(answers.hopingToAchieve as string) || null} />
            <Field label="Accessibility needs" value={(answers.accessibilityNeeds as string) || null} />
          </div>
        )}
      </Section>

      {/* session notes */}
      <Section id="notes" title="Session notes" subtitle={`${notes.length} ${notes.length === 1 ? "note" : "notes"} · append-only`}>
        <NoteForm clientId={client.id} />
        {notes.length === 0 ? (
          <Empty>No notes recorded yet.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
            {notes.map((n) => (
              <article
                key={n.id}
                style={{
                  border: "1px solid rgba(31,58,95,0.1)",
                  borderRadius: 12,
                  padding: "14px 18px",
                  background: n.supersededAt ? "rgba(31,58,95,0.03)" : "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                  <strong style={{ fontSize: 13, color: "var(--navy)" }}>
                    {n.authorName ?? n.authorEmail ?? "Unknown author"}
                  </strong>
                  <span style={{ fontSize: 12, color: "var(--navy-soft)" }}>{dt(n.createdAt)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)", whiteSpace: "pre-wrap" }}>
                  {n.body}
                </p>
                {n.agreedActions && (
                  <p style={{ margin: "10px 0 0", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)" }}>
                    <strong style={{ color: "var(--navy)" }}>Agreed actions: </strong>
                    {n.agreedActions}
                  </p>
                )}
                {n.supersededAt && (
                  <p style={{ margin: "10px 0 0", fontSize: 12, fontWeight: 700, color: "#856a12" }}>
                    Amended {dt(n.supersededAt)} — the original text above is retained.
                  </p>
                )}
                {n.amendments.length > 0 && (
                  <div style={{ marginTop: 10, paddingLeft: 14, borderLeft: "3px solid rgba(212,175,55,0.5)" }}>
                    {n.amendments.map((am) => (
                      <div key={am.id} style={{ marginBottom: 8 }}>
                        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)", whiteSpace: "pre-wrap" }}>
                          {am.body}
                        </p>
                        <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "var(--navy-soft)" }}>
                          Amendment · {am.reason} · {dt(am.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <AmendNoteForm noteId={n.id} clientId={client.id} />
              </article>
            ))}
          </div>
        )}
      </Section>

      {/* supervision & session planning */}
      <Section
        id="supervision"
        title="Supervision & session planning"
        subtitle={`${supervision.length} ${supervision.length === 1 ? "sheet" : "sheets"} · locked once finalised`}
      >
        <Link href={`/admin/clients/${client.id}/supervision/new`} className="pill pill-teal" style={{ padding: "10px 20px", fontSize: 13.5 }}>
          Start a supervision sheet
        </Link>
        {supervision.length === 0 ? (
          <div style={{ marginTop: 14 }}>
            <Empty>No supervision sheets yet.</Empty>
          </div>
        ) : (
          <ul style={{ margin: "16px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {supervision.map((r) => (
              <li key={r.id} style={{ fontSize: 14, color: "var(--ink)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span style={chip(r.status === "draft")}>{r.status === "draft" ? "Draft" : "Final"}</span>
                <Link href={`/admin/clients/${client.id}/supervision/${r.id}`} style={{ fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none" }}>
                  Supervision {d(r.supervisionDate)}
                </Link>
                <span style={{ color: "var(--navy-soft)" }}>{r.practitionerName ?? r.practitionerEmail ?? ""}</span>
                {r.needsFollowUp && (
                  <span style={{ fontSize: 11.5, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "#c853241a", color: "#8c2a1c" }}>
                    Section 3 flag
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* worksheets */}
      <Section
        id="worksheets"
        title="Worksheets"
        subtitle={`${worksheets.length} set · the client completes them in their account`}
      >
        <AssignWorksheetForm clientId={client.id} library={library} sessions={pastSessions} />
        {worksheets.length === 0 ? (
          <div style={{ marginTop: 14 }}>
            <Empty>No worksheets set yet.</Empty>
          </div>
        ) : (
          <ul style={{ margin: "16px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {worksheets.map((w) => (
              <li key={w.id} style={{ fontSize: 14, color: "var(--ink)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                <Link href={`/admin/clients/${client.id}/worksheets/${w.id}`} style={{ fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none" }}>
                  {getTemplate(w.templateKey, w.templateVersion)?.title ?? w.templateKey}
                </Link>
                <span style={{ fontWeight: 700, color: w.status === "submitted" ? "#a1421c" : "var(--navy-soft)" }}>
                  {WORKSHEET_STATUS_LABEL[w.status as WorksheetStatus]}
                </span>
                <span style={{ color: "var(--navy-soft)" }}>set {d(w.assignedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* safeguarding */}
      <Section id="safeguarding" title="Safeguarding concerns" subtitle={`${concerns.length} recorded`}>
        <div style={{ marginBottom: 16 }}>
          <RaiseConcernForm
            clientId={client.id}
            clientName={client.preferredName}
            practitioners={practitioners}
            me={me}
            emergencyContact={seeContact ? contactLines(ec) : null}
          />
        </div>
        {concerns.length === 0 ? (
          <Empty>No safeguarding concerns recorded.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {concerns.map((c) => (
              <div key={c.id} id={`concern-${c.id}`} style={{ border: "1px solid rgba(31,58,95,0.1)", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                  <strong style={{ fontSize: 13.5, color: "var(--navy)" }}>{labelsFor(CONCERN_TYPES, c.concernTypes, c.concernTypeOther).join("; ")}</strong>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.status === "closed" ? "var(--navy-soft)" : "#a1421c" }}>
                    {c.status}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--navy-soft)", marginLeft: "auto" }}>{dt(c.occurredAt)}</span>
                </div>
                <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--navy-soft)" }}>
                  Immediate threat to life or serious harm: <strong style={{ color: "var(--ink)" }}>{labelFor(IMMEDIATE_THREAT, c.immediateThreat)}</strong>
                </p>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--ink)", whiteSpace: "pre-wrap" }}>{c.detail}</p>
                <details style={{ marginTop: 10 }}>
                  <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--teal-deep)" }}>Read the full record</summary>
                  <SafeguardingRecord c={c} clientName={client.preferredName} names={names} />
                </details>
                {c.status !== "closed" && <CloseConcernForm concernId={c.id} clientId={client.id} />}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* referrals */}
      <Section id="referrals" title="Referrals & signposting" subtitle={`${referrals.length} recorded`}>
        <ReferralForm clientId={client.id} />
        {referrals.length === 0 ? (
          <Empty>No referrals recorded.</Empty>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {referrals.map((r) => (
              <li key={r.id} style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.55 }}>
                <strong style={{ color: "var(--navy)" }}>{r.organisationName ?? "Directory organisation"}</strong> —{" "}
                {r.reason} <span style={{ color: "var(--navy-soft)" }}>({r.outcome}, {d(r.madeAt)})</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* appointments + packages */}
      <Section id="sessions" title="Appointments & sessions" subtitle={`${remaining} session${remaining === 1 ? "" : "s"} remaining`}>
        {appointments.length === 0 ? (
          <Empty>No appointments booked.</Empty>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {appointments.map((a) => (
              <li key={a.id} style={{ fontSize: 14, color: "var(--ink)" }}>
                <strong style={{ color: "var(--navy)" }}>{dt(a.startsAt)}</strong> — {kindLabel(a.kind)},{" "}
                {a.status.replace(/_/g, " ")}
                {a.chargedToPackage && " (charged)"}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* discounts: founder and admins only */}
      {canDiscount && (
        <Section id="discounts" title="Discounts & free sessions" subtitle="Only the founder and admins see this">
          {concession ? (
            <div style={{ border: "1px solid rgba(31,58,95,0.1)", borderRadius: 12, padding: "13px 17px" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <strong style={{ fontSize: 14, color: "var(--navy)" }}>{concession.label}</strong>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{describeDiscount(concession)}</span>
                <span style={{ fontSize: 12.5, color: "var(--navy-soft)" }}>on {concessionPlans(concession.planSlugs)}</span>
              </div>
              <div style={{ marginTop: 4, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: "var(--navy-soft)" }}>
                <span>{reasonLabel(concession.reason)}</span>
                {concession.maxUses != null && <span>Up to {concession.maxUses} purchase{concession.maxUses === 1 ? "" : "s"}</span>}
                {concession.endsAt && <span>Until {d(new Date(concession.endsAt.getTime() - 1))}</span>}
                <span>Given {d(concession.createdAt)}</span>
              </div>
              {concession.note && <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--navy-soft)" }}>Note: {concession.note}</p>}
              <div style={{ marginTop: 8 }}>
                <EndDiscountButton discountId={concession.id} kind="client" />
              </div>
            </div>
          ) : (
            <Empty>No concession. The client pays the listed prices.</Empty>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <ConcessionForm clientId={client.id} plans={plans} hasConcession={!!concession} />
            <FreeSessionsForm clientId={client.id} />
          </div>

          {discountHistory.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, color: "var(--navy)" }}>Discounted and free purchases</p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {discountHistory.map((o) => (
                  <li key={o.id} style={{ fontSize: 13.5, color: "var(--ink)" }}>
                    <strong style={{ color: "var(--navy)" }}>{d(o.createdAt)}</strong> — {o.plan}:{" "}
                    {o.complimentary && o.amountPence === 0
                      ? `complimentary (${o.discountLabel ?? "free"})`
                      : `${penceLabel(o.amountPence)} instead of ${penceLabel(o.listPricePence ?? o.amountPence)} (${o.discountLabel ?? "discount"})`}
                    <span style={{ color: "var(--navy-soft)" }}> · {o.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}

      {/* consent */}
      <Section id="consent" title="Consent" subtitle="Each pinned to the policy version accepted">
        {consents.length === 0 ? (
          <Empty>No consents recorded.</Empty>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {consents.map((c) => (
              <li key={c.id} style={{ fontSize: 14, color: "var(--ink)" }}>
                <strong style={{ color: "var(--navy)" }}>{c.type.replace(/_/g, " ")}</strong>
                {c.policySlug && ` · ${c.policySlug} v${c.policyVersion ?? "?"}`} · {dt(c.grantedAt)}
                {c.withdrawnAt && (
                  <span style={{ color: "#a1421c", fontWeight: 700 }}> · withdrawn {d(c.withdrawnAt)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* documents */}
      <Section id="documents" title="Documents" subtitle={`${documents.length} stored · private, access logged`}>
        <UploadDocumentForm clientId={client.id} />
        {documents.length === 0 ? (
          <Empty>No documents uploaded.</Empty>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {documents.map((doc) => (
              <li
                key={doc.id}
                style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap", fontSize: 14, color: "var(--ink)" }}
              >
                <span>
                  <strong style={{ color: "var(--navy)" }}>{doc.filename}</strong>{" "}
                  <span style={{ color: "var(--navy-soft)" }}>
                    ({doc.category}, {d(doc.uploadedAt)}
                    {doc.visibleToClient ? ", shared with client" : ""})
                  </span>
                </span>
                <span style={{ display: "inline-flex", gap: 16, alignItems: "center" }}>
                  <a href={`/api/documents/${doc.id}`} style={{ fontSize: 13, fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none" }}>
                    Download
                  </a>
                  <DeleteDocumentButton documentId={doc.id} clientId={client.id} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="messages" title="Secure messages" subtitle="Inside the portal — nothing personal is sent by email">
        <MessageThread clientId={client.id} messages={conversation ?? []} placeholder="Write to this client…" />
      </Section>

    </div>
  );
}
