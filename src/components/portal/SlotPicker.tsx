"use client";

import * as React from "react";
import { useActionState } from "react";
import { bookAppointment } from "@/app/actions/booking";
import { initialBookingState } from "@/lib/booking-state";

type SlotGroup = { date: string; label: string; slots: { iso: string; time: string }[] };

/**
 * Slot picker.
 *
 * Grouped by day so a month of availability stays readable, and the selected
 * time is echoed back in full before confirming — a mis-tapped slot is a
 * missed session for someone who may have waited weeks for it.
 */
export function SlotPicker({ groups, durationMinutes }: { groups: SlotGroup[]; durationMinutes: number }) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [state, action, pending] = useActionState(bookAppointment, initialBookingState);

  if (state.status === "ok") {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 21, color: "var(--navy)" }}>You&apos;re booked</h2>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>{state.message}</p>
      </div>
    );
  }

  const chosen = groups.flatMap((g) => g.slots).find((s) => s.iso === selected);

  return (
    <form action={action}>
      <input type="hidden" name="startsAt" value={selected ?? ""} />
      <input type="hidden" name="durationMinutes" value={durationMinutes} />

      {state.status === "error" && (
        <p role="alert" style={{ margin: "0 0 16px", padding: "11px 14px", borderRadius: 10, background: "rgba(180,85,63,0.1)", border: "1px solid rgba(180,85,63,0.3)", fontSize: 13.5, color: "#8c3f2e" }}>
          {state.message}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {groups.map((g) => (
          <div key={g.date}>
            <h3 style={{ margin: "0 0 9px", fontSize: 13, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--navy-soft)" }}>
              {g.label}
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {g.slots.map((s) => {
                const active = selected === s.iso;
                return (
                  <button
                    key={s.iso}
                    type="button"
                    onClick={() => setSelected(s.iso)}
                    aria-pressed={active}
                    style={{
                      fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer",
                      padding: "10px 16px", borderRadius: 50,
                      border: active ? "2px solid var(--teal)" : "1px solid rgba(31,58,95,0.18)",
                      background: active ? "rgba(79,168,168,0.12)" : "#fff",
                      color: active ? "var(--teal-deep)" : "var(--navy)",
                    }}
                  >
                    {s.time}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <button className="pill pill-gold" disabled={!selected || pending} style={{ padding: "14px 28px", fontSize: 15, opacity: !selected || pending ? 0.55 : 1 }}>
          {pending ? "Booking…" : "Confirm this time"}
        </button>
        <span style={{ fontSize: 13.5, color: "var(--navy-soft)" }}>
          {chosen ? `${chosen.time}, ${groups.find((g) => g.slots.some((s) => s.iso === selected))?.label}` : "Choose a time above."}
        </span>
      </div>
    </form>
  );
}
