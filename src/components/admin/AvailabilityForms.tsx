"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  addAvailabilityException,
  addAvailabilityRule,
  removeAvailabilityRule,
} from "@/app/actions/booking";
import { initialBookingState } from "@/lib/booking-state";

const input: React.CSSProperties = {
  fontFamily: "inherit", fontSize: 14, padding: "10px 12px", borderRadius: 10,
  border: "1px solid rgba(31,58,95,0.18)", background: "#fff", color: "var(--ink)", outline: "none",
};
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: "var(--navy)", display: "block", marginBottom: 5 };

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Status({ state }: { state: { status: string; message: string } }) {
  if (state.status === "idle") return null;
  return (
    <p role="status" style={{ margin: 0, fontSize: 13, fontWeight: 700, color: state.status === "ok" ? "var(--teal-deep)" : "#a1421c" }}>
      {state.message}
    </p>
  );
}

export function AddRuleForm() {
  const [state, action, pending] = useActionState(addAvailabilityRule, initialBookingState);
  return (
    <form action={action} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
      <div>
        <label htmlFor="dayOfWeek" style={lbl}>Day</label>
        <select id="dayOfWeek" name="dayOfWeek" defaultValue="1" style={input}>
          {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="startTime" style={lbl}>From</label>
        <input id="startTime" name="startTime" type="time" defaultValue="18:00" style={input} />
      </div>
      <div>
        <label htmlFor="endTime" style={lbl}>To</label>
        <input id="endTime" name="endTime" type="time" defaultValue="20:00" style={input} />
      </div>
      <button className="pill pill-teal" disabled={pending} style={{ padding: "10px 20px", fontSize: 13.5, opacity: pending ? 0.6 : 1 }}>
        {pending ? "Adding…" : "Add window"}
      </button>
      <Status state={state} />
    </form>
  );
}

export function RemoveRuleButton({ ruleId }: { ruleId: string }) {
  const [, action, pending] = useActionState(removeAvailabilityRule, initialBookingState);
  return (
    <form action={action} style={{ display: "inline" }}>
      <input type="hidden" name="ruleId" value={ruleId} />
      <button
        disabled={pending}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#a1421c", fontWeight: 700, fontSize: 13, fontFamily: "inherit", padding: 0 }}
      >
        {pending ? "Removing…" : "Remove"}
      </button>
    </form>
  );
}

export function BlockDateForm() {
  const [state, action, pending] = useActionState(addAvailabilityException, initialBookingState);
  return (
    <form action={action} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
      <div>
        <label htmlFor="date" style={lbl}>Date</label>
        <input id="date" name="date" type="date" style={input} />
      </div>
      <div>
        <label htmlFor="bStart" style={lbl}>From (optional)</label>
        <input id="bStart" name="startTime" type="time" style={input} />
      </div>
      <div>
        <label htmlFor="bEnd" style={lbl}>To (optional)</label>
        <input id="bEnd" name="endTime" type="time" style={input} />
      </div>
      <div>
        <label htmlFor="reason" style={lbl}>Reason</label>
        <input id="reason" name="reason" placeholder="Leave, training…" style={{ ...input, minWidth: 180 }} />
      </div>
      <button className="pill pill-ghost" disabled={pending} style={{ padding: "10px 20px", fontSize: 13.5, opacity: pending ? 0.6 : 1 }}>
        {pending ? "Blocking…" : "Block time"}
      </button>
      <Status state={state} />
    </form>
  );
}
