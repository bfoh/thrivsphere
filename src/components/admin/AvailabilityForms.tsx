"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  addAvailabilityException,
  addAvailabilityRule,
  removeAvailabilityException,
  removeAvailabilityRule,
  setDefaultMeetingLink,
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

/** Whose calendar a form changes; empty means the signed-in practitioner's own. */
function For({ practitionerId }: { practitionerId?: string }) {
  return practitionerId ? <input type="hidden" name="practitionerId" value={practitionerId} /> : null;
}

export function AddRuleForm({ practitionerId }: { practitionerId?: string }) {
  const [state, action, pending] = useActionState(addAvailabilityRule, initialBookingState);
  return (
    <form action={action} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
      <For practitionerId={practitionerId} />
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

export function BlockDateForm({ practitionerId }: { practitionerId?: string }) {
  const [state, action, pending] = useActionState(addAvailabilityException, initialBookingState);
  return (
    <form action={action} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
      <For practitionerId={practitionerId} />
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

/** Hours on one date outside the weekly pattern. */
export function OpenHoursForm({ practitionerId }: { practitionerId?: string }) {
  const [state, action, pending] = useActionState(addAvailabilityException, initialBookingState);
  return (
    <form action={action} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
      <For practitionerId={practitionerId} />
      <input type="hidden" name="kind" value="open" />
      <div>
        <label htmlFor="oDate" style={lbl}>Date</label>
        <input id="oDate" name="date" type="date" required style={input} />
      </div>
      <div>
        <label htmlFor="oStart" style={lbl}>From</label>
        <input id="oStart" name="startTime" type="time" required defaultValue="10:00" style={input} />
      </div>
      <div>
        <label htmlFor="oEnd" style={lbl}>To</label>
        <input id="oEnd" name="endTime" type="time" required defaultValue="13:00" style={input} />
      </div>
      <button className="pill pill-teal" disabled={pending} style={{ padding: "10px 20px", fontSize: 13.5, opacity: pending ? 0.6 : 1 }}>
        {pending ? "Opening…" : "Open hours"}
      </button>
      <Status state={state} />
    </form>
  );
}

export function RemoveExceptionButton({ exceptionId }: { exceptionId: string }) {
  const [, action, pending] = useActionState(removeAvailabilityException, initialBookingState);
  return (
    <form action={action} style={{ display: "inline" }}>
      <input type="hidden" name="exceptionId" value={exceptionId} />
      <button
        disabled={pending}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#a1421c", fontWeight: 700, fontSize: 13, fontFamily: "inherit", padding: 0 }}
      >
        {pending ? "Removing…" : "Remove"}
      </button>
    </form>
  );
}

/**
 * Default meeting room.
 *
 * Added to every new booking with this practitioner, so clients find a joining
 * link in their account without anyone pasting one per session.
 */
export function DefaultRoomForm({ practitionerId, hasLink }: { practitionerId?: string; hasLink: boolean }) {
  const [state, action, pending] = useActionState(setDefaultMeetingLink, initialBookingState);
  return (
    <form action={action} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
      <For practitionerId={practitionerId} />
      <div style={{ flex: "1 1 320px" }}>
        <label htmlFor="meetingLink" style={lbl}>Meeting room link</label>
        <input
          id="meetingLink"
          name="meetingLink"
          type="url"
          required
          placeholder={hasLink ? "Saved — paste a new link to replace it" : "https://… (Zoom, Teams or Meet room)"}
          style={{ ...input, width: "100%" }}
        />
      </div>
      <button className="pill pill-teal" disabled={pending} style={{ padding: "10px 20px", fontSize: 13.5, opacity: pending ? 0.6 : 1 }}>
        {pending ? "Saving…" : hasLink ? "Replace" : "Save room"}
      </button>
      <span style={{ fontSize: 12, color: "var(--navy-soft)", flexBasis: "100%" }}>
        Encrypted, and shown only in the client&apos;s account — never emailed.
      </span>
      <Status state={state} />
    </form>
  );
}
