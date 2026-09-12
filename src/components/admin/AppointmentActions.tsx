"use client";

import * as React from "react";
import { useActionState } from "react";
import { setAppointmentStatus, setMeetingLink } from "@/app/actions/booking";
import { initialBookingState } from "@/lib/booking-state";

const btn: React.CSSProperties = {
  fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
  padding: "7px 13px", borderRadius: 50, border: "1px solid rgba(31,58,95,0.2)",
  background: "#fff", color: "var(--navy)",
};

export function StatusButtons({ appointmentId }: { appointmentId: string }) {
  const [state, action, pending] = useActionState(setAppointmentStatus, initialBookingState);
  return (
    <form action={action} style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <button name="status" value="completed" disabled={pending} style={{ ...btn, borderColor: "var(--teal)", color: "var(--teal-deep)" }}>
        Completed
      </button>
      <button name="status" value="no_show" disabled={pending} style={{ ...btn, borderColor: "#c8a24a", color: "#856a12" }}>
        No-show
      </button>
      <button name="status" value="cancelled_by_service" disabled={pending} style={{ ...btn, borderColor: "#c86b52", color: "#a1421c" }}>
        Cancel
      </button>
      {state.status !== "idle" && (
        <span style={{ fontSize: 12, fontWeight: 700, color: state.status === "ok" ? "var(--teal-deep)" : "#a1421c" }}>
          {state.message}
        </span>
      )}
    </form>
  );
}

/**
 * Joining link.
 *
 * Stored encrypted and shown only inside the client's authenticated portal.
 * The reminder is on screen because the safe habit has to be the obvious one.
 */
export function MeetingLinkForm({ appointmentId, hasLink }: { appointmentId: string; hasLink: boolean }) {
  const [state, action, pending] = useActionState(setMeetingLink, initialBookingState);
  return (
    <form action={action} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input
        name="meetingLink"
        type="url"
        placeholder={hasLink ? "Link saved — paste a new one to replace" : "https://… joining link"}
        style={{
          fontFamily: "inherit", fontSize: 13, padding: "8px 12px", borderRadius: 8,
          border: "1px solid rgba(31,58,95,0.18)", minWidth: 280, flex: "1 1 280px",
        }}
      />
      <button className="pill pill-teal" disabled={pending} style={{ padding: "8px 16px", fontSize: 12.5, opacity: pending ? 0.6 : 1 }}>
        {pending ? "Saving…" : hasLink ? "Replace" : "Save link"}
      </button>
      <span style={{ fontSize: 11.5, color: "var(--navy-soft)", flexBasis: "100%" }}>
        Encrypted, and shown only in the client&apos;s account — never emailed.
      </span>
      {state.status !== "idle" && (
        <span style={{ fontSize: 12, fontWeight: 700, color: state.status === "ok" ? "var(--teal-deep)" : "#a1421c" }}>
          {state.message}
        </span>
      )}
    </form>
  );
}
