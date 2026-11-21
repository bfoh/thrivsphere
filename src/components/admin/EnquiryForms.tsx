"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  addEnquiryNote,
  assignEnquiry,
  logEnquiryContact,
  sendEnquiryBookingLink,
  setEnquiryStatus,
} from "@/app/actions/enquiries";
import { initialEnquiryAdminState, type EnquiryAdminState } from "@/lib/enquiry-state";
import { QUEUE_STATUSES } from "@/lib/enquiry-rules";

/** The staff controls on an enquiry record (IT handover §16.4, §19). */

const input: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 14,
  padding: "9px 11px",
  borderRadius: 10,
  border: "1px solid rgba(31,58,95,0.18)",
  background: "#fff",
  width: "100%",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: "var(--navy)", display: "block", marginBottom: 5 };
const row: React.CSSProperties = { display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" };

function Result({ state }: { state: EnquiryAdminState }) {
  if (state.status === "idle") return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} style={{ margin: "8px 0 0", fontSize: 12.5, fontWeight: 700, color: state.status === "error" ? "#a1421c" : "var(--teal-deep)" }}>
      {state.message}
    </p>
  );
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button className="pill pill-teal" disabled={pending} style={{ padding: "9px 18px", fontSize: 13, opacity: pending ? 0.6 : 1 }}>
      {pending ? "Saving…" : children}
    </button>
  );
}

export function StatusForm({ enquiryId, status }: { enquiryId: string; status: string }) {
  const [state, action, pending] = useActionState(setEnquiryStatus, initialEnquiryAdminState);
  return (
    <form action={action}>
      <input type="hidden" name="enquiryId" value={enquiryId} />
      <div style={row}>
        <div style={{ flex: "1 1 200px" }}>
          <label htmlFor="status" style={labelStyle}>Status</label>
          <select id="status" name="status" defaultValue={QUEUE_STATUSES.some((s) => s.value === status) ? status : ""} style={input}>
            {!QUEUE_STATUSES.some((s) => s.value === status) && <option value="">Choose…</option>}
            {QUEUE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <Submit pending={pending}>Update</Submit>
      </div>
      <Result state={state} />
    </form>
  );
}

export function AssignForm({ enquiryId, assignedTo, staff }: { enquiryId: string; assignedTo: string | null; staff: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(assignEnquiry, initialEnquiryAdminState);
  return (
    <form action={action}>
      <input type="hidden" name="enquiryId" value={enquiryId} />
      <div style={row}>
        <div style={{ flex: "1 1 200px" }}>
          <label htmlFor="assignedTo" style={labelStyle}>Assigned to</label>
          <select id="assignedTo" name="assignedTo" defaultValue={assignedTo ?? ""} style={input}>
            <option value="">Nobody yet</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <Submit pending={pending}>Assign</Submit>
      </div>
      <Result state={state} />
    </form>
  );
}

export function BookingLinkForm({ enquiryId, practitioners }: { enquiryId: string; practitioners: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(sendEnquiryBookingLink, initialEnquiryAdminState);
  return (
    <form action={action}>
      <input type="hidden" name="enquiryId" value={enquiryId} />
      <div style={row}>
        <div style={{ flex: "1 1 200px" }}>
          <label htmlFor="practitionerId" style={labelStyle}>Book with</label>
          <select id="practitionerId" name="practitionerId" defaultValue="" style={input}>
            <option value="">First available</option>
            {practitioners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <button className="pill pill-gold" disabled={pending} style={{ padding: "9px 18px", fontSize: 13, opacity: pending ? 0.6 : 1 }}>
          {pending ? "Sending…" : "Send booking link"}
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}

export function ContactLogForm({ enquiryId }: { enquiryId: string }) {
  const [state, action, pending] = useActionState(logEnquiryContact, initialEnquiryAdminState);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="enquiryId" value={enquiryId} />
      <div style={{ maxWidth: 240 }}>
        <label htmlFor="channel" style={labelStyle}>How</label>
        <select id="channel" name="channel" defaultValue="phone" style={input}>
          <option value="phone">Phone call</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label htmlFor="outcome" style={labelStyle}>Outcome</label>
        <textarea id="outcome" name="outcome" rows={2} maxLength={1000} placeholder="e.g. Spoke to them; booking link to follow. No health details here." style={{ ...input, resize: "vertical" }} />
      </div>
      <div>
        <Submit pending={pending}>Log contact</Submit>
      </div>
      <Result state={state} />
    </form>
  );
}

export function NoteForm({ enquiryId }: { enquiryId: string }) {
  const [state, action, pending] = useActionState(addEnquiryNote, initialEnquiryAdminState);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="enquiryId" value={enquiryId} />
      <div>
        <label htmlFor="note" style={labelStyle}>Internal note</label>
        <textarea id="note" name="note" rows={2} maxLength={2000} placeholder="Seen by staff only, never by the enquirer." style={{ ...input, resize: "vertical" }} />
      </div>
      <div>
        <Submit pending={pending}>Add note</Submit>
      </div>
      <Result state={state} />
    </form>
  );
}
