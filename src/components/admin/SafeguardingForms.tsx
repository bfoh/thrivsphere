"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  amendNote,
  clearRiskFlag,
  closeConcern,
  raiseConcern,
  recordReferral,
} from "@/app/actions/safeguarding";
import { initialSafeguardingState } from "@/lib/safeguarding-state";
import {
  AGREED_ACTIONS,
  AROSE,
  CLIENT_AGREEMENT,
  CONCERN_TYPES,
  DISCUSSED_WITH,
  IMMEDIATE_THREAT,
  NEXT_STEPS,
  RECORDING_REMINDER,
  flagReason,
  shouldShowCrisisGuidance,
} from "@/lib/safeguarding-rules";
import { Icon } from "@/components/icons";

const input: React.CSSProperties = { fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
const errStyle: React.CSSProperties = { margin: "4px 0 0", fontSize: 12, fontWeight: 600, color: "var(--a-danger)" };

function Status({ state }: { state: { status: string; message: string } }) {
  if (state.status === "idle") return null;
  return (
    <p role="status" style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 700, color: state.status === "ok" ? "var(--teal-deep)" : "var(--a-danger)" }}>
      {state.message}
    </p>
  );
}

/**
 * Crisis guidance shown inline while recording a concern about life or
 * serious harm. The record may be completed while someone is still on a call,
 * so the numbers belong on screen at that moment.
 */
function CrisisGuidance() {
  return (
    <div
      role="alert"
      style={{
        background: "var(--navy)", borderRadius: 12, padding: "14px 18px",
        color: "#e7eefa", fontSize: 13.5, lineHeight: 1.6, display: "flex", gap: 10,
      }}
    >
      <span style={{ flex: "0 0 auto", marginTop: 2 }}>
        <Icon name="shield" size={18} stroke="var(--gold)" />
      </span>
      <div>
        <strong style={{ color: "#fff", display: "block", marginBottom: 4 }}>
          If there is an immediate risk to life, act before finishing this form.
        </strong>
        Emergency <strong style={{ color: "#fff" }}>999</strong> · Samaritans{" "}
        <strong style={{ color: "#fff" }}>116 123</strong> · NHS urgent mental health{" "}
        <strong style={{ color: "#fff" }}>111</strong>. Stay with the person if you can. Record what
        you did below. If the client is outside the UK, use the emergency number for where they are;
        their emergency contact may be in another country too.
      </div>
    </div>
  );
}

const fieldset: React.CSSProperties = { border: "1px solid var(--a-line)", borderRadius: 12, padding: "14px 16px 16px", margin: 0, background: "#fff", display: "flex", flexDirection: "column", gap: 12 };
const legend: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: "var(--navy)", padding: "0 6px" };
const question: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--navy)", margin: "0 0 6px" };
const choice: React.CSSProperties = { display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13.5, color: "var(--ink)", lineHeight: 1.45 };
const twoCol: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };

type Opt = { readonly key: string; readonly label: string };

function Err({ fe, name }: { fe: Record<string, string>; name: string }) {
  return fe[name] ? <p role="alert" style={errStyle}>{fe[name]}</p> : null;
}

function Text({ name, label, fe, rows, short }: { name: string; label: string; fe: Record<string, string>; rows?: number; short?: boolean }) {
  return (
    <div>
      <label htmlFor={`sg-${name}`} style={question}>{label}</label>
      {short ? (
        <input id={`sg-${name}`} name={name} maxLength={300} style={input} />
      ) : (
        <textarea id={`sg-${name}`} name={name} rows={rows ?? 3} style={{ ...input, resize: "vertical" }} />
      )}
      <Err fe={fe} name={name} />
    </div>
  );
}

function Ticks({ name, options, label, fe, otherName, onChange }: { name: string; options: readonly Opt[]; label: string; fe: Record<string, string>; otherName?: string; onChange?: (keys: string[]) => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const changed = () => {
    if (!onChange || !ref.current) return;
    onChange([...ref.current.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`)].map((i) => i.value));
  };
  return (
    <div role="group" aria-labelledby={`sg-${name}-q`} ref={ref}>
      <p id={`sg-${name}-q`} style={question}>{label}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {options.map((o) => (
          <label key={o.key} style={choice}>
            <input type="checkbox" name={name} value={o.key} onChange={changed} style={{ marginTop: 3 }} />
            <span style={{ flex: 1 }}>
              {o.label}
              {o.key === "other" && otherName && (
                <input name={otherName} aria-label={`${label} ${o.label}`} maxLength={300} style={{ ...input, marginTop: 6, padding: "7px 10px" }} />
              )}
            </span>
          </label>
        ))}
      </div>
      <Err fe={fe} name={name} />
      {otherName && <Err fe={fe} name={otherName} />}
    </div>
  );
}

function Choose({ name, options, label, fe, value, onChange }: { name: string; options: readonly Opt[]; label: string; fe: Record<string, string>; value?: string; onChange?: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-labelledby={`sg-${name}-q`}>
      <p id={`sg-${name}-q`} style={question}>{label}</p>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        {options.map((o) => (
          <label key={o.key} style={choice}>
            <input
              type="radio"
              name={name}
              value={o.key}
              {...(onChange ? { checked: value === o.key, onChange: () => onChange(o.key) } : {})}
              style={{ marginTop: 3 }}
            />
            {o.label}
          </label>
        ))}
      </div>
      <Err fe={fe} name={name} />
    </div>
  );
}

function When({ prefix, label, fe, date, time }: { prefix: string; label: string; fe: Record<string, string>; date?: string; time?: string }) {
  return (
    <div>
      <p style={question}>{label}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <label style={{ fontSize: 12.5, color: "var(--navy-soft)", display: "flex", flexDirection: "column", gap: 4 }}>
          Date
          <input type="date" name={`${prefix}Date`} defaultValue={date} style={{ ...input, width: 180 }} />
        </label>
        <label style={{ fontSize: 12.5, color: "var(--navy-soft)", display: "flex", flexDirection: "column", gap: 4 }}>
          Time
          <input type="time" name={`${prefix}Time`} defaultValue={time} style={{ ...input, width: 140 }} />
        </label>
      </div>
      <Err fe={fe} name={`${prefix}Date`} />
    </div>
  );
}

const YES_NO = [
  { key: "no", label: "No" },
  { key: "yes", label: "Yes" },
] as const;
const YES_NO_INFORMED = [
  { key: "yes", label: "Yes" },
  { key: "no", label: "No" },
] as const;

/** Today's date and the time now, in UK time, for the form's defaults. */
function londonNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const v = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${v("year")}-${v("month")}-${v("day")}`, time: `${v("hour")}:${v("minute")}` };
}

/**
 * The Safeguarding Incident / Concern Record, as the owner's form sets it out.
 * Answers stay in place if something needs completing; nothing is saved
 * until the whole record is.
 */
export function RaiseConcernForm({
  clientId,
  clientName,
  practitioners,
  me,
  emergencyContact,
}: {
  clientId: string;
  clientName: string;
  practitioners: { id: string; name: string }[];
  me: { id: string; name: string } | null;
  /** The client's Emergency Contact / Next of Kin, or null if this person may not see it. */
  emergencyContact: string[] | null;
}) {
  const [state, action, pending] = useActionState(raiseConcern, initialSafeguardingState);
  const [, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [types, setTypes] = React.useState<string[]>([]);
  const [threat, setThreat] = React.useState("");
  const [nextSteps, setNextSteps] = React.useState<string[]>([]);
  const [trusted, setTrusted] = React.useState("");
  const [external, setExternal] = React.useState("");
  const [internal, setInternal] = React.useState("");
  const [now, setNow] = React.useState<{ date: string; time: string } | null>(null);
  const fe = state.fieldErrors ?? {};

  // Close the form once a record is saved; the page shows it in the list.
  const last = React.useRef(state);
  React.useEffect(() => {
    if (state !== last.current && state.status === "ok") {
      setOpen(false);
      setTypes([]); setThreat(""); setNextSteps([]); setTrusted(""); setExternal(""); setInternal("");
    }
    last.current = state;
  }, [state]);

  if (!open) {
    return (
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => { setNow(londonNow()); setOpen(true); }}
          className="pill pill-ghost"
          style={{ padding: "10px 20px", fontSize: 13.5, borderColor: "#c86b52", color: "var(--a-danger)" }}
        >
          Complete a Safeguarding Incident / Concern Record
        </button>
        {state.status === "ok" && <Status state={state} />}
      </div>
    );
  }

  const showCrisis = shouldShowCrisisGuidance(types, threat);
  const willFlag = flagReason({ immediateThreat: threat as "no", nextSteps });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      noValidate
      style={{
        display: "flex", flexDirection: "column", gap: 16, padding: "18px 20px",
        borderRadius: 12, background: "var(--a-danger-soft)", border: "1px solid var(--a-danger-line)",
      }}
    >
      <input type="hidden" name="clientId" value={clientId} />
      <div>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "var(--navy)" }}>Safeguarding Incident / Concern Record</h3>
        <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>
          Complete this form when the ThriveSphere Safeguarding &amp; Safety Escalation Procedure has been activated.
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>
          This record documents the concern, decisions and actions taken. It is not a clinical risk assessment or risk-scoring tool.
        </p>
      </div>

      {showCrisis && <CrisisGuidance />}

      <fieldset style={fieldset}>
        <legend style={legend}>1. Client and Session Details</legend>
        <p style={{ margin: 0, fontSize: 13.5 }}><span style={question}>Client Name/ID: </span>{clientName}</p>
        <When prefix="occurred" label="Date and time" fe={fe} date={now?.date} time={now?.time} />
        <div>
          <label htmlFor="sg-practitionerId" style={question}>Wellbeing Practitioner</label>
          <select id="sg-practitionerId" name="practitionerId" defaultValue={me?.id ?? ""} style={input}>
            <option value="">Choose…</option>
            {practitioners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Err fe={fe} name="practitionerId" />
        </div>
        <Text name="clientLocation" label="Client's current country/location, if relevant:" fe={fe} short />
      </fieldset>

      <fieldset style={fieldset}>
        <legend style={legend}>2. Safeguarding / Safety Concern</legend>
        <Ticks name="arose" options={AROSE} label="How did the concern arise?" fe={fe} otherName="aroseOther" />
        <Ticks name="concernTypes" options={CONCERN_TYPES} label="Type of concern:" fe={fe} otherName="concernTypeOther" onChange={setTypes} />
        <Text name="detail" label="Briefly record what happened or was disclosed. Use the client's own words where important:" fe={fe} rows={5} />
      </fieldset>

      <fieldset style={fieldset}>
        <legend style={legend}>3. Immediate Safety</legend>
        <Choose name="immediateThreat" options={IMMEDIATE_THREAT} label="Did there appear to be an immediate threat to life or serious harm?" fe={fe} value={threat} onChange={setThreat} />
        <Text name="immediateThreatInfo" label="Relevant information used to make this decision:" fe={fe} />
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "var(--navy-soft)" }}>Do not use numerical or low / medium / high risk scoring.</p>
      </fieldset>

      <fieldset style={fieldset}>
        <legend style={legend}>4. Client&apos;s Wishes and Agreed Action</legend>
        <Text name="clientWishes" label="What did the client want to happen?" fe={fe} />
        <Ticks name="agreedActions" options={AGREED_ACTIONS} label="Action agreed with the client:" fe={fe} otherName="agreedActionOther" />
        <Text name="agreedActionDetails" label="Details:" fe={fe} />
      </fieldset>

      <fieldset style={fieldset}>
        <legend style={legend}>5. Trusted Person / Emergency Contact</legend>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink)", background: "var(--a-subtle)", borderRadius: 10, padding: "10px 14px" }}>
          <strong style={{ color: "var(--navy)" }}>On the client&apos;s record: </strong>
          {emergencyContact
            ? emergencyContact.join(" · ")
            : "only the Safeguarding Lead, the Deputy and the client's own practitioners can see the emergency contact."}
          <span style={{ display: "block", color: "var(--navy-soft)" }}>
            Nobody is contacted automatically. Record any contact you make here.
          </span>
        </div>
        <Choose name="trustedPersonRequired" options={YES_NO} label="Was involvement required?" fe={fe} value={trusted} onChange={setTrusted} />
        {trusted === "yes" && (
          <>
            <Choose name="trustedPersonAgreed" options={CLIENT_AGREEMENT} label="Client agreed to involvement:" fe={fe} />
            <Text name="trustedPersonContacted" label="Person contacted, if applicable:" fe={fe} short />
            <Text name="trustedPersonOutcome" label="Action/outcome:" fe={fe} />
          </>
        )}
      </fieldset>

      <fieldset style={fieldset}>
        <legend style={legend}>6. External Service / Information Sharing</legend>
        <Choose name="externalContacted" options={YES_NO} label="Was an external professional, safeguarding or emergency service contacted?" fe={fe} value={external} onChange={setExternal} />
        {external === "yes" && (
          <>
            <Text name="escalatedTo" label="Service/person contacted:" fe={fe} short />
            <When prefix="escalated" label="Date/time:" fe={fe} />
            <Text name="informationShared" label="Information shared:" fe={fe} />
            <Text name="sharingReason" label="Reason for sharing:" fe={fe} />
            <Choose name="sharingClientInformed" options={YES_NO_INFORMED} label="Client informed:" fe={fe} />
            <Text name="sharedWithoutConsentReason" label="If information was shared without the client's agreement, briefly record why this was considered necessary and proportionate:" fe={fe} />
          </>
        )}
      </fieldset>

      <fieldset style={fieldset}>
        <legend style={legend}>7. Internal Escalation</legend>
        <Choose name="discussedInternally" options={YES_NO} label="Was the concern discussed internally?" fe={fe} value={internal} onChange={setInternal} />
        {internal === "yes" && (
          <>
            <Ticks name="discussedWith" options={DISCUSSED_WITH} label="Discussed with:" fe={fe} />
            <When prefix="discussed" label="Date/time:" fe={fe} />
            <Text name="internalAdvice" label="Advice/decision:" fe={fe} />
          </>
        )}
      </fieldset>

      <fieldset style={fieldset}>
        <legend style={legend}>8. Outcome and ThriveSphere Follow-Up</legend>
        <Text name="contactOutcome" label="Outcome at the end of the contact:" fe={fe} />
        <Ticks name="nextSteps" options={NEXT_STEPS} label="ThriveSphere next step:" fe={fe} otherName="nextStepOther" onChange={setNextSteps} />
        <Text name="followUpAction" label="Follow-up action:" fe={fe} />
        <div style={twoCol} className="two-col">
          <Text name="followUpBy" label="Who is responsible:" fe={fe} short />
          <div>
            <label htmlFor="sg-followUpDate" style={question}>Follow-up date, if applicable:</label>
            <input id="sg-followUpDate" type="date" name="followUpDate" style={input} />
            <Err fe={fe} name="followUpDate" />
          </div>
        </div>
      </fieldset>

      <fieldset style={fieldset}>
        <legend style={legend}>9. Practitioner Record</legend>
        <Text name="additionalInfo" label="Any additional relevant information:" fe={fe} />
        <div style={twoCol} className="two-col">
          <p style={{ margin: 0, fontSize: 13.5 }}><span style={question}>Practitioner Name: </span>{me?.name ?? "You"}</p>
          <div>
            <label htmlFor="sg-initials" style={question}>Signature/Initials:</label>
            <input id="sg-initials" name="initials" maxLength={12} style={{ ...input, width: 140 }} />
            <Err fe={fe} name="initials" />
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--navy-soft)" }}>Date and time completed are added when you save.</p>
      </fieldset>

      <div style={{ border: "1px solid rgba(138,109,18,0.35)", background: "rgba(212,175,55,0.08)", borderRadius: 12, padding: "12px 16px" }}>
        <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 800, color: "var(--a-gold)" }}>Recording Reminder</p>
        {RECORDING_REMINDER.map((line) => (
          <p key={line} style={{ margin: "0 0 4px", fontSize: 13, lineHeight: 1.5, color: "var(--ink)" }}>{line}</p>
        ))}
      </div>

      {willFlag && (
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--a-danger)" }}>
          Saving this record puts a safeguarding flag on the client&apos;s record ({willFlag.toLowerCase()}). It stays until the Safeguarding Lead or Deputy stands it down.
        </p>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="pill pill-teal" disabled={pending} style={{ padding: "10px 20px", fontSize: 13.5, opacity: pending ? 0.6 : 1 }}>
          {pending ? "Saving…" : "Save record"}
        </button>
        <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "var(--navy-soft)" }}>
          Cancel
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}

export function CloseConcernForm({ concernId, clientId }: { concernId: string; clientId: string }) {
  const [state, action, pending] = useActionState(closeConcern, initialSafeguardingState);
  return (
    <form action={action} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
      <input type="hidden" name="concernId" value={concernId} />
      <input type="hidden" name="clientId" value={clientId} />
      <input name="outcome" placeholder="Outcome" style={{ ...input, flex: "1 1 240px", width: "auto" }} />
      <button className="pill pill-ghost" disabled={pending} style={{ padding: "8px 16px", fontSize: 12.5 }}>
        {pending ? "Closing…" : "Close concern"}
      </button>
      <Status state={state} />
    </form>
  );
}

export function ClearFlagButton({ flagId, clientId }: { flagId: string; clientId: string }) {
  const [state, action, pending] = useActionState(clearRiskFlag, initialSafeguardingState);
  return (
    <form action={action} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <input type="hidden" name="flagId" value={flagId} />
      <input type="hidden" name="clientId" value={clientId} />
      <button
        disabled={pending}
        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--teal-deep)", padding: 0 }}
      >
        {pending ? "Clearing…" : "Stand down"}
      </button>
      {state.status === "error" && <span style={{ fontSize: 12, color: "var(--a-danger)" }}>{state.message}</span>}
    </form>
  );
}

export function ReferralForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(recordReferral, initialSafeguardingState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 14 }}>
      <input type="hidden" name="clientId" value={clientId} />
      <div style={{ flex: "1 1 200px" }}>
        <input name="organisationName" aria-label="Service referred to" placeholder="Service referred to" style={input} />
        {fe.organisationName && <p style={errStyle}>{fe.organisationName}</p>}
      </div>
      <div style={{ flex: "2 1 260px" }}>
        <input name="reason" aria-label="Reason for referral" placeholder="Reason for referral" style={input} />
        {fe.reason && <p style={errStyle}>{fe.reason}</p>}
      </div>
      <button className="pill pill-teal" disabled={pending} style={{ padding: "10px 18px", fontSize: 13 }}>
        {pending ? "Saving…" : "Record"}
      </button>
      <div style={{ flexBasis: "100%" }}><Status state={state} /></div>
    </form>
  );
}

/** Amend a note. Supervisor-only; the original text is never altered. */
export function AmendNoteForm({ noteId, clientId }: { noteId: string; clientId: string }) {
  const [state, action, pending] = useActionState(amendNote, initialSafeguardingState);
  const [open, setOpen] = React.useState(false);
  const fe = state.fieldErrors ?? {};

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--teal-deep)", padding: 0, marginTop: 10 }}
      >
        Add an amendment
      </button>
    );
  }

  return (
    <form action={action} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name="noteId" value={noteId} />
      <input type="hidden" name="clientId" value={clientId} />
      <textarea name="body" rows={3} placeholder="The correction" style={{ ...input, resize: "vertical" }} />
      {fe.body && <p style={errStyle}>{fe.body}</p>}
      <input name="reason" aria-label="Why this amendment is needed" placeholder="Why this amendment is needed" style={input} />
      {fe.reason && <p style={errStyle}>{fe.reason}</p>}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="pill pill-teal" disabled={pending} style={{ padding: "8px 16px", fontSize: 12.5 }}>
          {pending ? "Saving…" : "Save amendment"}
        </button>
        <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, color: "var(--navy-soft)" }}>
          Cancel
        </button>
        <span style={{ fontSize: 12, color: "var(--navy-soft)" }}>The original note stays exactly as written.</span>
      </div>
      <Status state={state} />
    </form>
  );
}
