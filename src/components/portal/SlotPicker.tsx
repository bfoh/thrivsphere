"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { bookAppointment } from "@/app/actions/booking";
import { rescheduleOwnAppointment } from "@/app/actions/appointments";
import { startBookingCheckout } from "@/app/actions/payments";
import { initialBookingState, type BookingState } from "@/lib/booking-state";
import type { SlotGroup } from "@/lib/slot-groups";

type Practitioner = { id: string; name: string };

/**
 * Slot picker.
 *
 * Grouped by day so a month of availability stays readable, and the selected
 * time is echoed back in full before confirming — a mis-tapped slot is a
 * missed session for someone who may have waited weeks for it.
 *
 * The client may choose a practitioner or take the first available (IT
 * handover §19). With `checkout`, the session is the initial consultation and
 * is paid for at Stripe as it is booked: the price, the length and the
 * booking terms are shown, and the terms must be accepted, before paying.
 */
export function SlotPicker({
  groups,
  rescheduleId,
  practitioners = [],
  defaultPractitionerId,
  checkout,
  noticePeriod,
}: {
  groups: SlotGroup[];
  /** Set when moving an existing appointment rather than booking a new one. */
  rescheduleId?: string;
  /** Practitioners the client can choose between, by name. */
  practitioners?: Practitioner[];
  defaultPractitionerId?: string;
  /** Book and pay in one go: the initial consultation. */
  checkout?: { name: string; price: string; minutes: number };
  noticePeriod?: string;
}) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [practitionerId, setPractitionerId] = React.useState<string>(
    practitioners.some((p) => p.id === defaultPractitionerId) ? defaultPractitionerId! : ""
  );
  const action = (rescheduleId ? rescheduleOwnAppointment : checkout ? startBookingCheckout : bookAppointment) as (
    prev: BookingState,
    fd: FormData
  ) => Promise<BookingState>;
  const [state, formAction, pending] = useActionState(action, initialBookingState);

  // Only the times the chosen practitioner is free for.
  const shown = React.useMemo(
    () =>
      practitionerId
        ? groups
            .map((g) => ({ ...g, slots: g.slots.filter((s) => !s.practitionerIds || s.practitionerIds.includes(practitionerId)) }))
            .filter((g) => g.slots.length > 0)
        : groups,
    [groups, practitionerId]
  );

  if (state.status === "ok") {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 21, color: "var(--navy)" }}>
          {rescheduleId ? "Your appointment has moved" : "You're booked"}
        </h2>
        <p style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>{state.message}</p>
        <Link href="/portal/appointments" className="pill pill-teal" style={{ padding: "11px 22px", fontSize: 14 }}>
          See my appointments
        </Link>
      </div>
    );
  }

  const chosenGroup = shown.find((g) => g.slots.some((s) => s.iso === selected));
  const chosen = chosenGroup?.slots.find((s) => s.iso === selected);
  const chosenName = practitioners.find((p) => p.id === practitionerId)?.name;
  const whenText = chosen && chosenGroup ? `${chosenGroup.label}, ${chosen.time}` : null;

  return (
    <form action={formAction}>
      <input type="hidden" name="startsAt" value={chosen ? selected ?? "" : ""} />
      <input type="hidden" name="practitionerId" value={practitionerId} />
      {rescheduleId && <input type="hidden" name="appointmentId" value={rescheduleId} />}

      {state.status === "error" && (
        <p role="alert" style={{ margin: "0 0 16px", padding: "11px 14px", borderRadius: 10, background: "rgba(180,85,63,0.1)", border: "1px solid rgba(180,85,63,0.3)", fontSize: 13.5, color: "#8c3f2e" }}>
          {state.message}
        </p>
      )}

      {practitioners.length > 0 && (
        <fieldset style={{ border: 0, margin: "0 0 22px", padding: 0 }}>
          <legend style={{ padding: 0, marginBottom: 9, fontSize: 13, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--navy-soft)" }}>
            Practitioner
          </legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[{ id: "", name: "First available" }, ...practitioners].map((p) => {
              const active = practitionerId === p.id;
              return (
                <button
                  key={p.id || "any"}
                  type="button"
                  onClick={() => {
                    setPractitionerId(p.id);
                    setSelected(null);
                  }}
                  aria-pressed={active}
                  style={chip(active)}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {shown.length === 0 ? (
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
          {chosenName ? `${chosenName} has no times available in the next few weeks.` : "There are no times available right now."}{" "}
          {chosenName && (
            <button type="button" onClick={() => setPractitionerId("")} style={{ ...linkButton }}>
              See every practitioner&apos;s times
            </button>
          )}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {shown.map((g) => (
            <div key={g.date}>
              <h3 style={{ margin: "0 0 9px", fontSize: 13, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--navy-soft)" }}>
                {g.label}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {g.slots.map((s) => {
                  const active = selected === s.iso;
                  return (
                    <button key={s.iso} type="button" onClick={() => setSelected(s.iso)} aria-pressed={active} style={chip(active)}>
                      {s.time}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {checkout ? (
        <div className="card" style={{ marginTop: 26, padding: "20px 22px", border: "1px solid rgba(79,168,168,0.35)" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 17, color: "var(--navy)" }}>{checkout.name}</h3>
          <dl style={{ margin: "0 0 14px", display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", fontSize: 14.5, color: "var(--ink)" }}>
            <dt style={dt}>Price</dt>
            <dd style={dd}>
              <strong>{checkout.price}</strong>
            </dd>
            <dt style={dt}>Length</dt>
            <dd style={dd}>{checkout.minutes} minutes, online</dd>
            <dt style={dt}>When</dt>
            <dd style={dd}>{whenText ? `${whenText} (UK time)` : "Choose a time above"}</dd>
            <dt style={dt}>With</dt>
            <dd style={dd}>{chosenName ?? "The first available practitioner"}</dd>
          </dl>
          <label htmlFor="bookingTerms" style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)" }}>
            {/* Never ticked in advance (handover §15.1, §19). */}
            <input id="bookingTerms" name="bookingTerms" type="checkbox" style={{ marginTop: 3 }} />
            <span>
              I accept the{" "}
              <Link href="/terms" target="_blank" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
                booking terms
              </Link>{" "}
              and the{" "}
              <Link href="/payments" target="_blank" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
                cancellation policy
              </Link>
              : to cancel or move this appointment free of charge, I&apos;ll give at least {noticePeriod}&apos; notice.
            </span>
          </label>
          <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <button className="pill pill-gold" disabled={!chosen || pending} style={{ padding: "14px 28px", fontSize: 15, opacity: !chosen || pending ? 0.55 : 1 }}>
              {pending ? "Taking you to payment…" : `Pay ${checkout.price} securely`}
            </button>
            <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--navy-soft)", maxWidth: 360 }}>
              You&apos;ll pay on Stripe&apos;s secure page; your card details never reach ThriveSphere. The time is
              held for you while you pay.
            </span>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <button className="pill pill-gold" disabled={!chosen || pending} style={{ padding: "14px 28px", fontSize: 15, opacity: !chosen || pending ? 0.55 : 1 }}>
            {pending ? (rescheduleId ? "Moving…" : "Booking…") : rescheduleId ? "Move to this time" : "Confirm this time"}
          </button>
          <span style={{ fontSize: 13.5, color: "var(--navy-soft)" }}>
            {whenText ? `${whenText}${chosenName ? `, with ${chosenName}` : ""}` : "Choose a time above."}
          </span>
        </div>
      )}
    </form>
  );
}

function chip(active: boolean): React.CSSProperties {
  return {
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    padding: "10px 16px",
    borderRadius: 50,
    border: active ? "2px solid var(--teal)" : "1px solid rgba(31,58,95,0.18)",
    background: active ? "rgba(79,168,168,0.12)" : "#fff",
    color: active ? "var(--teal-deep)" : "var(--navy)",
  };
}

const dt: React.CSSProperties = { fontSize: 12.5, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--navy-soft)", paddingTop: 2 };
const dd: React.CSSProperties = { margin: 0 };
const linkButton: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 15,
  fontWeight: 700,
  color: "var(--teal-deep)",
  background: "none",
  border: 0,
  padding: 0,
  cursor: "pointer",
  textDecoration: "underline",
};
