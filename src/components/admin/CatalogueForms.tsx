"use client";

import * as React from "react";
import { useActionState } from "react";
import { updatePricePlan, updateService } from "@/app/actions/catalogue";
import { initialBookingState } from "@/lib/booking-state";

const input: React.CSSProperties = {
  fontFamily: "inherit", fontSize: 14, padding: "9px 11px", borderRadius: 9,
  border: "1px solid rgba(31,58,95,0.18)", background: "#fff", color: "var(--ink)", outline: "none", width: "100%",
};
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: "var(--navy)", display: "block", marginBottom: 5 };

export type EditablePlan = {
  id: string;
  slug: string;
  name: string;
  blurb: string | null;
  price: string;
  sessions: number;
  sortOrder: number;
  active: boolean;
  featured: boolean;
};

/** One price plan, edited in place. */
export function PlanForm({ plan }: { plan: EditablePlan }) {
  const [state, action, pending] = useActionState(updatePricePlan, initialBookingState);
  const id = (field: string) => `${plan.slug}-${field}`;

  return (
    <form action={action} style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="planId" value={plan.id} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <div style={{ gridColumn: "span 2" }}>
          <label htmlFor={id("name")} style={lbl}>Name</label>
          <input id={id("name")} name="name" defaultValue={plan.name} required style={input} />
        </div>
        <div>
          <label htmlFor={id("price")} style={lbl}>Price (£)</label>
          <input id={id("price")} name="price" defaultValue={plan.price} inputMode="decimal" required style={input} />
        </div>
        <div>
          <label htmlFor={id("sessions")} style={lbl}>Sessions</label>
          <input id={id("sessions")} name="sessions" type="number" min={1} max={52} defaultValue={plan.sessions} required style={input} />
        </div>
        <div>
          <label htmlFor={id("sortOrder")} style={lbl}>Order on page</label>
          <input id={id("sortOrder")} name="sortOrder" type="number" defaultValue={plan.sortOrder} style={input} />
        </div>
      </div>
      <div>
        <label htmlFor={id("blurb")} style={lbl}>Description</label>
        <textarea id={id("blurb")} name="blurb" defaultValue={plan.blurb ?? ""} rows={2} style={{ ...input, resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 13.5, color: "var(--ink)" }}>
          <input type="checkbox" name="active" defaultChecked={plan.active} /> On sale
        </label>
        <label style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 13.5, color: "var(--ink)" }}>
          <input type="checkbox" name="featured" defaultChecked={plan.featured} /> Highlight on the pricing page
        </label>
        <button className="pill pill-teal" disabled={pending} style={{ marginLeft: "auto", padding: "9px 20px", fontSize: 13.5, opacity: pending ? 0.6 : 1 }}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state.status !== "idle" && (
        <p role="status" style={{ margin: 0, fontSize: 13, fontWeight: 700, color: state.status === "ok" ? "var(--teal-deep)" : "#a1421c" }}>
          {state.message}
        </p>
      )}
    </form>
  );
}

export type EditableService = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  description: string;
  points: string[];
  note: string | null;
  sortOrder: number;
  active: boolean;
};

/** One service's wording, edited in place. */
export function ServiceForm({ service }: { service: EditableService }) {
  const [state, action, pending] = useActionState(updateService, initialBookingState);
  const id = (field: string) => `${service.slug}-${field}`;

  return (
    <form action={action} style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="serviceId" value={service.id} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <div style={{ gridColumn: "span 2" }}>
          <label htmlFor={id("name")} style={lbl}>Name</label>
          <input id={id("name")} name="name" defaultValue={service.name} required style={input} />
        </div>
        <div>
          <label htmlFor={id("sortOrder")} style={lbl}>Order on page</label>
          <input id={id("sortOrder")} name="sortOrder" type="number" defaultValue={service.sortOrder} style={input} />
        </div>
      </div>
      <div>
        <label htmlFor={id("summary")} style={lbl}>Homepage summary (one line)</label>
        <input id={id("summary")} name="summary" defaultValue={service.summary ?? ""} style={input} />
      </div>
      <div>
        <label htmlFor={id("description")} style={lbl}>Description</label>
        <textarea id={id("description")} name="description" defaultValue={service.description} required rows={3} style={{ ...input, resize: "vertical" }} />
      </div>
      <div>
        <label htmlFor={id("points")} style={lbl}>Points (one per line)</label>
        <textarea id={id("points")} name="points" defaultValue={service.points.join("\n")} rows={Math.min(Math.max(service.points.length, 2), 12)} style={{ ...input, resize: "vertical" }} />
      </div>
      <div>
        <label htmlFor={id("note")} style={lbl}>Note beneath the points (optional)</label>
        <textarea id={id("note")} name="note" defaultValue={service.note ?? ""} rows={2} style={{ ...input, resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 13.5, color: "var(--ink)" }}>
          <input type="checkbox" name="active" defaultChecked={service.active} /> Shown on the website
        </label>
        <button className="pill pill-teal" disabled={pending} style={{ marginLeft: "auto", padding: "9px 20px", fontSize: 13.5, opacity: pending ? 0.6 : 1 }}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state.status !== "idle" && (
        <p role="status" style={{ margin: 0, fontSize: 13, fontWeight: 700, color: state.status === "ok" ? "var(--teal-deep)" : "#a1421c" }}>
          {state.message}
        </p>
      )}
    </form>
  );
}
