"use client";

import * as React from "react";
import { useActionState } from "react";
import { cancelOwnAppointment } from "@/app/actions/appointments";
import { initialBookingState } from "@/lib/booking-state";

/**
 * Cancel one appointment.
 *
 * Two steps, so the consequence is read before anything happens: the warning
 * is worked out on the server from the same 24-hour rule the action applies,
 * so what the client is told is what will happen.
 */
export function CancelAppointment({ appointmentId, warning }: { appointmentId: string; warning: string }) {
  const [confirming, setConfirming] = React.useState(false);
  const [state, action, pending] = useActionState(cancelOwnAppointment, initialBookingState);

  if (state.status === "ok") {
    return <p role="status" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "var(--teal-deep)" }}>{state.message}</p>;
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        style={{ fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, color: "#8c3f2e", background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}
      >
        Cancel
      </button>
    );
  }

  return (
    <form action={action} style={{ flexBasis: "100%", padding: "12px 14px", borderRadius: 10, background: "rgba(180,85,63,0.07)", border: "1px solid rgba(180,85,63,0.25)" }}>
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <p style={{ margin: "0 0 10px", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)" }}>{warning}</p>
      {state.status === "error" && (
        <p role="alert" style={{ margin: "0 0 10px", fontSize: 13.5, color: "#8c3f2e" }}>{state.message}</p>
      )}
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <button className="pill" disabled={pending} style={{ padding: "8px 18px", fontSize: 13.5, background: "#8c3f2e", color: "#fff", opacity: pending ? 0.6 : 1 }}>
          {pending ? "Cancelling…" : "Yes, cancel it"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          style={{ fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, color: "var(--navy)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          Keep it
        </button>
      </div>
    </form>
  );
}
