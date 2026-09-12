"use client";

import * as React from "react";
import { useActionState } from "react";
import { reportIncident } from "@/app/actions/safeguarding";
import { initialSafeguardingState } from "@/lib/safeguarding-state";

const input: React.CSSProperties = {
  fontFamily: "inherit", fontSize: 14, padding: "10px 12px", borderRadius: 10,
  border: "1px solid rgba(31,58,95,0.18)", background: "#fff", width: "100%", boxSizing: "border-box",
};
const errStyle: React.CSSProperties = { margin: "4px 0 0", fontSize: 12, fontWeight: 600, color: "#b4553f" };

const TYPES = [
  ["safeguarding", "Safeguarding"],
  ["data_breach", "Data breach"],
  ["technical_failure", "Technical failure"],
  ["boundary_violation", "Boundary violation"],
  ["complaint", "Complaint"],
  ["other", "Other"],
] as const;

export function IncidentForm() {
  const [state, action, pending] = useActionState(reportIncident, initialSafeguardingState);
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState("safeguarding");
  const fe = state.fieldErrors ?? {};

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="pill pill-ghost" style={{ padding: "10px 20px", fontSize: 13.5 }}>
        Log an incident
      </button>
    );
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 20px", borderRadius: 12, background: "rgba(31,58,95,0.03)", border: "1px solid rgba(31,58,95,0.12)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="two-col">
        <div>
          <label htmlFor="type" style={{ fontSize: 12, fontWeight: 800, color: "var(--navy)", display: "block", marginBottom: 5 }}>Type</label>
          <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)} style={input}>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="occurredAt" style={{ fontSize: 12, fontWeight: 800, color: "var(--navy)", display: "block", marginBottom: 5 }}>When it happened</label>
          <input id="occurredAt" name="occurredAt" type="datetime-local" style={input} />
          {fe.occurredAt && <p style={errStyle}>{fe.occurredAt}</p>}
        </div>
      </div>

      {type === "data_breach" && (
        <p role="alert" style={{ margin: 0, padding: "11px 14px", borderRadius: 10, background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.35)", fontSize: 13, lineHeight: 1.55, color: "var(--navy)" }}>
          A reportable personal-data breach must reach the ICO within <strong>72 hours</strong> of
          becoming aware of it. That clock runs from the time above.
        </p>
      )}

      <div>
        <input name="summary" placeholder="What happened" style={input} />
        {fe.summary && <p style={errStyle}>{fe.summary}</p>}
      </div>
      <textarea name="detail" rows={3} placeholder="Detail (optional)" style={{ ...input, resize: "vertical" }} />
      <textarea name="actionsTaken" rows={2} placeholder="Actions taken (optional)" style={{ ...input, resize: "vertical" }} />

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="pill pill-teal" disabled={pending} style={{ padding: "10px 20px", fontSize: 13.5, opacity: pending ? 0.6 : 1 }}>
          {pending ? "Logging…" : "Log incident"}
        </button>
        <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "var(--navy-soft)" }}>
          Cancel
        </button>
        {state.status !== "idle" && (
          <span style={{ fontSize: 13, fontWeight: 700, color: state.status === "ok" ? "var(--teal-deep)" : "#a1421c" }}>{state.message}</span>
        )}
      </div>
    </form>
  );
}
