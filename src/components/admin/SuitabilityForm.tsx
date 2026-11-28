"use client";

import * as React from "react";
import { useActionState } from "react";
import { recordSuitability } from "@/app/actions/suitability";
import { initialSuitabilityState } from "@/lib/suitability-state";
import { SUITABILITY_OUTCOMES } from "@/lib/suitability-rules";

const input: React.CSSProperties = { fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 12.5, fontWeight: 800, color: "var(--navy)", display: "block", marginBottom: 6 };
const errStyle: React.CSSProperties = { margin: "4px 0 0", fontSize: 12, fontWeight: 600, color: "#b4553f" };

/**
 * The practitioner's decision after the Initial Wellbeing Consultation
 * (IT handover §13.1). Nothing is preselected: the decision is always made.
 */
export function SuitabilityForm({ clientId, hasDecision }: { clientId: string; hasDecision: boolean }) {
  const [state, action, pending] = useActionState(recordSuitability, initialSuitabilityState);
  const [outcome, setOutcome] = React.useState("");
  const [open, setOpen] = React.useState(!hasDecision);
  const fe = state.fieldErrors ?? {};

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "var(--teal-deep)", padding: 0, marginTop: 12 }}
      >
        Record a new decision
      </button>
    );
  }

  return (
    <form action={action} style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
      <input type="hidden" name="clientId" value={clientId} />

      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend style={{ ...lbl, padding: 0 }}>Outcome</legend>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SUITABILITY_OUTCOMES.map((o) => (
            <label key={o.value} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--ink)", cursor: "pointer" }}>
              <input
                type="radio"
                name="outcome"
                value={o.value}
                checked={outcome === o.value}
                onChange={() => setOutcome(o.value)}
                style={{ marginTop: 3 }}
              />
              <span>
                <strong style={{ color: "var(--navy)" }}>{o.label}</strong>
                <span style={{ display: "block", fontSize: 12.5, color: "var(--navy-soft)" }}>{o.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {fe.outcome && <p style={errStyle}>{fe.outcome}</p>}
      </fieldset>

      <div>
        <label htmlFor="rationale" style={lbl}>Rationale</label>
        <textarea
          id="rationale"
          name="rationale"
          rows={3}
          maxLength={2000}
          placeholder="Why, in a sentence or two. Seen by staff only."
          style={{ ...input, resize: "vertical" }}
        />
        {fe.rationale && <p style={errStyle}>{fe.rationale}</p>}
      </div>

      {outcome === "not_suitable" && (
        <div>
          <label htmlFor="signpostedTo" style={lbl}>Signposted to</label>
          <input id="signpostedTo" name="signpostedTo" maxLength={200} placeholder="e.g. their GP, NHS Talking Therapies" style={input} />
          {fe.signpostedTo && <p style={errStyle}>{fe.signpostedTo}</p>}
          <p style={{ margin: "6px 0 0", fontSize: 12.5, lineHeight: 1.5, color: "var(--navy-soft)" }}>
            This is added under Referrals. The client is not emailed: please explain the decision to them
            yourself. The owner is reminded that the £30 may need refunding in Stripe.
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button className="pill pill-teal" disabled={pending || !outcome} style={{ padding: "10px 20px", fontSize: 13.5, opacity: pending || !outcome ? 0.6 : 1 }}>
          {pending ? "Saving…" : "Record decision"}
        </button>
        {hasDecision && (
          <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "var(--navy-soft)" }}>
            Cancel
          </button>
        )}
      </div>

      {state.status !== "idle" && (
        <p role={state.status === "error" ? "alert" : "status"} style={{ margin: 0, fontSize: 13, fontWeight: 700, color: state.status === "error" ? "#a1421c" : "var(--teal-deep)" }}>
          {state.message}
        </p>
      )}
    </form>
  );
}
