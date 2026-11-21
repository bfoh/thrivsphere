import type * as React from "react";
import type { safeguardingConcerns } from "@/db/schema";
import {
  AGREED_ACTIONS,
  AROSE,
  CLIENT_AGREEMENT,
  CONCERN_TYPES,
  DISCUSSED_WITH,
  IMMEDIATE_THREAT,
  NEXT_STEPS,
  labelFor,
  labelsFor,
} from "@/lib/safeguarding-rules";

type Concern = typeof safeguardingConcerns.$inferSelect;

const dt = (v: Date | string | null) =>
  v
    ? new Date(v).toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;
const day = (v: string | null) =>
  v ? new Date(`${v}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
const yesNo = (v: boolean | null) => (v === null ? null : v ? "Yes" : "No");

const h: React.CSSProperties = { margin: "14px 0 6px", fontSize: 13, fontWeight: 800, color: "var(--navy)" };
const row: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(160px, 34%) 1fr", gap: 10, fontSize: 13.5, lineHeight: 1.5, padding: "3px 0" };

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  const empty = value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
  return (
    <div style={row}>
      <span style={{ color: "var(--navy-soft)" }}>{label}</span>
      <span style={{ color: empty ? "var(--navy-soft)" : "var(--ink)", whiteSpace: "pre-wrap" }}>
        {empty ? "Not recorded" : Array.isArray(value) ? value.join("; ") : value}
      </span>
    </div>
  );
}

/** A completed Safeguarding Incident / Concern Record, section by section. */
export function SafeguardingRecord({ c, clientName, names }: { c: Concern; clientName: string; names: Record<string, string> }) {
  const person = (id: string | null) => (id ? (names[id] ?? "Former member of staff") : null);
  return (
    <div>
      <h4 style={h}>1. Client and Session Details</h4>
      <Item label="Client Name/ID" value={clientName} />
      <Item label="Date and time" value={dt(c.occurredAt)} />
      <Item label="Wellbeing Practitioner" value={person(c.practitionerId)} />
      <Item label="Client's current country/location" value={c.clientLocation} />

      <h4 style={h}>2. Safeguarding / Safety Concern</h4>
      <Item label="How did the concern arise?" value={labelsFor(AROSE, c.arose, c.aroseOther)} />
      <Item label="Type of concern" value={labelsFor(CONCERN_TYPES, c.concernTypes, c.concernTypeOther)} />
      <Item label="What happened or was disclosed" value={c.detail} />

      <h4 style={h}>3. Immediate Safety</h4>
      <Item label="Immediate threat to life or serious harm?" value={labelFor(IMMEDIATE_THREAT, c.immediateThreat)} />
      <Item label="Relevant information used to make this decision" value={c.immediateThreatInfo} />

      <h4 style={h}>4. Client&apos;s Wishes and Agreed Action</h4>
      <Item label="What did the client want to happen?" value={c.clientWishes} />
      <Item label="Action agreed with the client" value={labelsFor(AGREED_ACTIONS, c.agreedActions, c.agreedActionOther)} />
      <Item label="Details" value={c.agreedActionDetails} />

      <h4 style={h}>5. Trusted Person / Emergency Contact</h4>
      <Item label="Was involvement required?" value={yesNo(c.trustedPersonRequired)} />
      {c.trustedPersonRequired && (
        <>
          <Item label="Client agreed to involvement" value={c.trustedPersonAgreed ? labelFor(CLIENT_AGREEMENT, c.trustedPersonAgreed) : null} />
          <Item label="Person contacted" value={c.trustedPersonContacted} />
          <Item label="Action/outcome" value={c.trustedPersonOutcome} />
        </>
      )}

      <h4 style={h}>6. External Service / Information Sharing</h4>
      <Item label="External professional, safeguarding or emergency service contacted?" value={yesNo(c.externalContacted)} />
      {c.externalContacted && (
        <>
          <Item label="Service/person contacted" value={c.escalatedTo} />
          <Item label="Date/time" value={dt(c.escalatedAt)} />
          <Item label="Information shared" value={c.informationShared} />
          <Item label="Reason for sharing" value={c.sharingReason} />
          <Item label="Client informed" value={yesNo(c.sharingClientInformed)} />
          <Item label="If shared without the client's agreement, why it was necessary and proportionate" value={c.sharedWithoutConsentReason} />
        </>
      )}

      <h4 style={h}>7. Internal Escalation</h4>
      <Item label="Was the concern discussed internally?" value={yesNo(c.discussedInternally)} />
      {c.discussedInternally && (
        <>
          <Item label="Discussed with" value={labelsFor(DISCUSSED_WITH, c.discussedWith)} />
          <Item label="Date/time" value={dt(c.discussedAt)} />
          <Item label="Advice/decision" value={c.internalAdvice} />
        </>
      )}

      <h4 style={h}>8. Outcome and ThriveSphere Follow-Up</h4>
      <Item label="Outcome at the end of the contact" value={c.contactOutcome} />
      <Item label="ThriveSphere next step" value={labelsFor(NEXT_STEPS, c.nextSteps, c.nextStepOther)} />
      <Item label="Follow-up action" value={c.followUpAction} />
      <Item label="Who is responsible" value={c.followUpBy} />
      <Item label="Follow-up date" value={day(c.followUpDate)} />

      <h4 style={h}>9. Practitioner Record</h4>
      <Item label="Any additional relevant information" value={c.additionalInfo} />
      <Item label="Practitioner Name" value={person(c.raisedBy)} />
      <Item label="Signature/Initials" value={c.initials} />
      <Item label="Date and time completed" value={dt(c.raisedAt)} />

      {c.status === "closed" && (
        <>
          <h4 style={h}>Closed</h4>
          <Item label="Outcome" value={c.outcome} />
          <Item label="Closed by" value={person(c.closedBy)} />
          <Item label="Closed on" value={dt(c.closedAt)} />
        </>
      )}
    </div>
  );
}
