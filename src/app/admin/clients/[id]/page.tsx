import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientRecord } from "@/lib/queries/clients";
import { RiskBadge } from "@/components/admin/RiskBadge";
import { Section, Field, Empty } from "@/components/admin/RecordUI";
import { NoteForm } from "@/components/admin/NoteForm";
import { Icon } from "@/components/icons";

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

  const { client, intake, riskFlags, concerns, notes, appointments, packages, consents, referrals, documents } =
    record;

  const answers = (intake?.answers ?? {}) as Record<string, unknown>;
  const remaining = packages
    .filter((p) => p.status === "active")
    .reduce((n, p) => n + (p.sessionsTotal - p.sessionsUsed), 0);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 24px 80px" }}>
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
            Active risk flags
          </h2>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {riskFlags.map((f) => (
              <li key={f.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <RiskBadge level={f.level} compact />
                <span style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.5, flex: "1 1 320px" }}>
                  <strong style={{ color: "var(--navy)" }}>{f.category.replace(/_/g, " ")}</strong> — {f.summary}
                </span>
                <span style={{ fontSize: 12, color: "var(--navy-soft)" }}>raised {d(f.raisedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <header style={{ marginTop: 20, marginBottom: 26 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 30, fontWeight: 800, color: "var(--navy)" }}>
          {client.preferredName}
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "var(--navy-soft)" }}>
          {client.email} · {client.status} · registered {d(client.createdAt)}
        </p>
      </header>

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
          <Field label="Emergency contact" value={client.emergencyContactName} />
          <Field label="Emergency phone" value={client.emergencyContactPhone} />
          <Field label="GP practice" value={client.gpPractice} />
          <Field label="18+ confirmed" value={client.confirmedAdult ? dt(client.confirmedAdultAt) : "Not confirmed"} />
        </div>
        {client.contactNotes && (
          <div style={{ marginTop: 14 }}>
            <Field label="Contact notes" value={client.contactNotes} />
          </div>
        )}
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
      <Section title="Session notes" subtitle={`${notes.length} ${notes.length === 1 ? "note" : "notes"} · append-only`}>
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
              </article>
            ))}
          </div>
        )}
      </Section>

      {/* safeguarding */}
      <Section title="Safeguarding concerns" subtitle={`${concerns.length} recorded`}>
        {concerns.length === 0 ? (
          <Empty>No safeguarding concerns recorded.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {concerns.map((c) => (
              <div key={c.id} style={{ border: "1px solid rgba(31,58,95,0.1)", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                  <RiskBadge level={c.level} compact />
                  <strong style={{ fontSize: 13.5, color: "var(--navy)" }}>{c.category.replace(/_/g, " ")}</strong>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.status === "closed" ? "var(--navy-soft)" : "#a1421c" }}>
                    {c.status}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--navy-soft)", marginLeft: "auto" }}>{dt(c.raisedAt)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--ink)" }}>{c.detail}</p>
                <div style={{ marginTop: 10, display: "grid", gap: 8 }} className="two-col">
                  <Field label="Immediate action" value={c.immediateAction} small />
                  <Field label="Escalated to" value={c.escalatedTo ? `${c.escalatedTo} (${dt(c.escalatedAt)})` : null} small />
                  <Field label="Client informed" value={c.clientInformed ? "Yes" : "No"} small />
                  <Field label="Outcome" value={c.outcome} small />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* referrals */}
      <Section title="Referrals & signposting" subtitle={`${referrals.length} recorded`}>
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
      <Section title="Appointments & sessions" subtitle={`${remaining} session${remaining === 1 ? "" : "s"} remaining`}>
        {appointments.length === 0 ? (
          <Empty>No appointments booked.</Empty>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {appointments.map((a) => (
              <li key={a.id} style={{ fontSize: 14, color: "var(--ink)" }}>
                <strong style={{ color: "var(--navy)" }}>{dt(a.startsAt)}</strong> — {a.status.replace(/_/g, " ")}
                {a.chargedToPackage && " (charged)"}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* consent */}
      <Section title="Consent" subtitle="Each pinned to the policy version accepted">
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
      <Section title="Documents" subtitle={`${documents.length} stored`}>
        {documents.length === 0 ? (
          <Empty>No documents uploaded.</Empty>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {documents.map((doc) => (
              <li key={doc.id} style={{ fontSize: 14, color: "var(--ink)" }}>
                {doc.filename} <span style={{ color: "var(--navy-soft)" }}>({doc.category}, {d(doc.uploadedAt)})</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
