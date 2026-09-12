"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  amendNote,
  clearRiskFlag,
  closeConcern,
  escalateConcern,
  raiseConcern,
  recordReferral,
} from "@/app/actions/safeguarding";
import { initialSafeguardingState } from "@/lib/safeguarding-state";
import {
  CONCERN_CATEGORIES,
  RISK_LEVELS,
  categoryLabel,
  shouldShowCrisisGuidance,
} from "@/lib/safeguarding-rules";
import { Icon } from "@/components/icons";

const input: React.CSSProperties = {
  fontFamily: "inherit", fontSize: 14, padding: "10px 12px", borderRadius: 10,
  border: "1px solid rgba(31,58,95,0.18)", background: "#fff", color: "var(--ink)",
  outline: "none", width: "100%", boxSizing: "border-box",
};
const lbl: React.CSSProperties = {
  fontSize: 12, fontWeight: 800, color: "var(--navy)", display: "block", marginBottom: 5,
};
const errStyle: React.CSSProperties = { margin: "4px 0 0", fontSize: 12, fontWeight: 600, color: "#b4553f" };

function Status({ state }: { state: { status: string; message: string } }) {
  if (state.status === "idle") return null;
  return (
    <p role="status" style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 700, color: state.status === "ok" ? "var(--teal-deep)" : "#a1421c" }}>
      {state.message}
    </p>
  );
}

/**
 * Crisis guidance shown inline while recording a life-risk concern.
 *
 * This form gets filled in while someone may still be on a call. The numbers
 * belong on screen at that moment, not in a policy document in another tab.
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
        you did below.
      </div>
    </div>
  );
}

export function RaiseConcernForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(raiseConcern, initialSafeguardingState);
  const [category, setCategory] = React.useState("adult_safeguarding");
  const [level, setLevel] = React.useState("low");
  const [consent, setConsent] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const fe = state.fieldErrors ?? {};

  const showCrisis = shouldShowCrisisGuidance(category, level);
  const needsAction = level === "high" || level === "immediate" || category === "child_at_risk" || category === "immediate_danger";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="pill pill-ghost"
        style={{ padding: "10px 20px", fontSize: 13.5, borderColor: "#c86b52", color: "#a1421c" }}
      >
        Raise a safeguarding concern
      </button>
    );
  }

  return (
    <form
      action={action}
      style={{
        display: "flex", flexDirection: "column", gap: 14, padding: "18px 20px",
        borderRadius: 12, background: "#c853240a", border: "1px solid #c8532444",
      }}
    >
      <input type="hidden" name="clientId" value={clientId} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="two-col">
        <div>
          <label htmlFor="category" style={lbl}>Category</label>
          <select id="category" name="category" value={category} onChange={(e) => setCategory(e.target.value)} style={input}>
            {CONCERN_CATEGORIES.map((c) => (
              <option key={c} value={c}>{categoryLabel(c)}</option>
            ))}
          </select>
          {fe.category && <p style={errStyle}>{fe.category}</p>}
        </div>
        <div>
          <label htmlFor="level" style={lbl}>Risk level</label>
          <select id="level" name="level" value={level} onChange={(e) => setLevel(e.target.value)} style={input}>
            {RISK_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          {fe.level && <p style={errStyle}>{fe.level}</p>}
        </div>
      </div>

      {showCrisis && <CrisisGuidance />}

      <div>
        <label htmlFor="detail" style={lbl}>What was said or observed</label>
        <textarea id="detail" name="detail" rows={4} style={{ ...input, resize: "vertical" }} placeholder="Record the person's own words where you can." />
        {fe.detail && <p style={errStyle}>{fe.detail}</p>}
      </div>

      <div>
        <label htmlFor="immediateAction" style={lbl}>
          What you did{needsAction ? "" : " (optional)"}
        </label>
        <textarea id="immediateAction" name="immediateAction" rows={3} style={{ ...input, resize: "vertical" }} />
        {fe.immediateAction && <p style={errStyle}>{fe.immediateAction}</p>}
      </div>

      <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13.5, color: "var(--ink)" }}>
        <input type="checkbox" name="clientInformed" style={{ marginTop: 3 }} />
        <span>I told the client I was recording this concern.</span>
      </label>

      <div>
        <label htmlFor="consentToShare" style={lbl}>Consent to share information</label>
        <select id="consentToShare" name="consentToShare" value={consent} onChange={(e) => setConsent(e.target.value)} style={input}>
          <option value="">Not applicable / not asked</option>
          <option value="yes">Consent given</option>
          <option value="no">Shared without consent</option>
        </select>
      </div>

      {consent === "no" && (
        <div>
          <label htmlFor="sharedWithoutConsentReason" style={lbl}>
            Why information was shared without consent
          </label>
          <textarea
            id="sharedWithoutConsentReason"
            name="sharedWithoutConsentReason"
            rows={2}
            style={{ ...input, resize: "vertical" }}
            placeholder="e.g. serious and immediate risk to life"
          />
          <p style={{ margin: "5px 0 0", fontSize: 12, color: "var(--navy-soft)", lineHeight: 1.5 }}>
            Sharing without consent can be lawful, but only if the justification is recorded at the
            time.
          </p>
          {fe.sharedWithoutConsentReason && <p style={errStyle}>{fe.sharedWithoutConsentReason}</p>}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="pill pill-teal" disabled={pending} style={{ padding: "10px 20px", fontSize: 13.5, opacity: pending ? 0.6 : 1 }}>
          {pending ? "Recording…" : "Record concern"}
        </button>
        <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "var(--navy-soft)" }}>
          Cancel
        </button>
        <span style={{ fontSize: 12, color: "var(--navy-soft)" }}>
          Medium risk and above also raises a flag on the record.
        </span>
      </div>
      <Status state={state} />
    </form>
  );
}

export function EscalateForm({ concernId, clientId }: { concernId: string; clientId: string }) {
  const [state, action, pending] = useActionState(escalateConcern, initialSafeguardingState);
  return (
    <form action={action} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
      <input type="hidden" name="concernId" value={concernId} />
      <input type="hidden" name="clientId" value={clientId} />
      <input name="escalatedTo" placeholder="Escalated to (service or person)" style={{ ...input, flex: "1 1 240px", width: "auto" }} />
      <button className="pill pill-ghost" disabled={pending} style={{ padding: "8px 16px", fontSize: 12.5 }}>
        {pending ? "Saving…" : "Record escalation"}
      </button>
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
      {state.status === "error" && <span style={{ fontSize: 12, color: "#a1421c" }}>{state.message}</span>}
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
        <input name="organisationName" placeholder="Service referred to" style={input} />
        {fe.organisationName && <p style={errStyle}>{fe.organisationName}</p>}
      </div>
      <div style={{ flex: "2 1 260px" }}>
        <input name="reason" placeholder="Reason for referral" style={input} />
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
      <input name="reason" placeholder="Why this amendment is needed" style={input} />
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
