"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  addFreeSessions,
  createCode,
  endConcession,
  giveConcession,
  turnOffCode,
} from "@/app/actions/discounts";
import { initialDiscountAdminState, type DiscountAdminState } from "@/lib/discount-state";
import { CODE_MAX_PERCENT, DEFAULT_CONCESSION_LABEL, DISCOUNT_REASONS, type PlanPrice } from "@/lib/discounts";

/** The founder's and admins' discount controls: concessions, codes and free sessions. */

const input: React.CSSProperties = { fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: "var(--navy)", display: "block", marginBottom: 5 };
const hint: React.CSSProperties = { margin: "4px 0 0", fontSize: 12, color: "var(--muted)" };
const errStyle: React.CSSProperties = { margin: "4px 0 0", fontSize: 12, fontWeight: 600, color: "var(--a-danger)" };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 };
const linkButton: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 700,
  color: "var(--teal-deep)",
  padding: 0,
};

type Action = (prev: DiscountAdminState, fd: FormData) => Promise<DiscountAdminState>;

/**
 * Submitting through `onSubmit` rather than the form's `action` keeps what
 * was typed when the server sends back an error.
 */
function useDiscountAction(fn: Action) {
  const [state, dispatch, pending] = useActionState(fn, initialDiscountAdminState);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    React.startTransition(() => dispatch(fd));
  };
  return { state, pending, onSubmit };
}

function Err({ fe, name }: { fe: Record<string, string>; name: string }) {
  return fe[name] ? <p style={errStyle}>{fe[name]}</p> : null;
}

function Result({ state }: { state: DiscountAdminState }) {
  if (state.status === "idle") return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} style={{ margin: "8px 0 0", fontSize: 12.5, fontWeight: 700, color: state.status === "error" ? "var(--a-danger)" : "var(--teal-deep)" }}>
      {state.message}
    </p>
  );
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button className="pill pill-teal" disabled={pending} style={{ padding: "9px 18px", fontSize: 13, opacity: pending ? 0.6 : 1, alignSelf: "flex-start" }}>
      {pending ? "Saving…" : children}
    </button>
  );
}

/**
 * A form behind a button. Once saved it closes and shows what happened, so a
 * second click can't give the same thing twice by accident.
 */
function Panel({
  openLabel,
  againLabel,
  fn,
  submitLabel,
  children,
}: {
  openLabel: string;
  againLabel: string;
  fn: Action;
  submitLabel: string;
  children: (fe: Record<string, string>) => React.ReactNode;
}) {
  const { state, pending, onSubmit } = useDiscountAction(fn);
  const [open, setOpen] = React.useState(false);
  const [dismissed, setDismissed] = React.useState<DiscountAdminState | null>(null);
  const done = state.status === "ok" && state !== dismissed;

  if (done || !open) {
    return (
      <div style={{ marginTop: 10 }}>
        {done && <Result state={state} />}
        <button
          type="button"
          style={{ ...linkButton, marginTop: done ? 8 : 0 }}
          onClick={() => {
            setDismissed(state);
            setOpen(true);
          }}
        >
          {done ? againLabel : openLabel}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14, padding: 16, borderRadius: 12, background: "var(--a-subtle)" }}>
      {children(state.fieldErrors ?? {})}
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <Submit pending={pending}>{submitLabel}</Submit>
        <button type="button" style={{ ...linkButton, color: "var(--muted)" }} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {state.status === "error" && <Result state={state} />}
    </form>
  );
}

/** Percent or £ off, what it covers, and limits: shared by concessions and codes. */
function AmountFields({ kind, plans, fe }: { kind: "client" | "code"; plans: PlanPrice[]; fe: Record<string, string> }) {
  const [type, setType] = React.useState<"percent" | "amount">("percent");
  const max = kind === "code" ? CODE_MAX_PERCENT : 100;
  return (
    <>
      <div style={grid}>
        <div>
          <span style={lbl}>Discount</span>
          <div style={{ display: "flex", gap: 8 }}>
            <select name="type" value={type} onChange={(e) => setType(e.target.value as "percent" | "amount")} style={{ ...input, width: 110 }} aria-label="Kind of discount">
              <option value="percent">% off</option>
              <option value="amount">£ off</option>
            </select>
            <input name="value" inputMode="decimal" placeholder={type === "percent" ? "50" : "10"} style={input} aria-label={type === "percent" ? "Percentage off" : "Pounds off"} />
          </div>
          <p style={hint}>
            {type === "percent"
              ? `1 to ${max}%.${kind === "client" ? " 100% makes it free." : ""}`
              : "Taken off each purchase."}
          </p>
          <Err fe={fe} name="value" />
        </div>
        <div>
          <label htmlFor={`${kind}-endsOn`} style={lbl}>Ends (optional)</label>
          <input id={`${kind}-endsOn`} name="endsOn" type="date" style={input} />
          <p style={hint}>Works until the end of that day.</p>
          <Err fe={fe} name="endsOn" />
        </div>
      </div>

      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend style={{ ...lbl, padding: 0 }}>Applies to</legend>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {plans.map((p) => (
            <label key={p.slug} style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 13.5, color: "var(--ink)", cursor: "pointer" }}>
              <input type="checkbox" name="planSlugs" value={p.slug} defaultChecked />
              {p.name}
            </label>
          ))}
        </div>
        <Err fe={fe} name="planSlugs" />
      </fieldset>
    </>
  );
}

function NoteField({ id, fe }: { id: string; fe: Record<string, string> }) {
  return (
    <div>
      <label htmlFor={id} style={lbl}>Internal note (optional)</label>
      <input id={id} name="note" maxLength={300} style={input} />
      <p style={hint}>Staff only. Never record health details here.</p>
      <Err fe={fe} name="note" />
    </div>
  );
}

function ReasonField({ id, fe }: { id: string; fe: Record<string, string> }) {
  return (
    <div>
      <label htmlFor={id} style={lbl}>Reason</label>
      <select id={id} name="reason" defaultValue="" style={input}>
        <option value="" disabled>Choose…</option>
        {DISCOUNT_REASONS.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      <Err fe={fe} name="reason" />
    </div>
  );
}

/* ------------------------------------------------------------ concessions */

export function ConcessionForm({ clientId, plans, hasConcession }: { clientId: string; plans: PlanPrice[]; hasConcession: boolean }) {
  return (
    <Panel
      fn={giveConcession}
      openLabel={hasConcession ? "Replace the concession" : "Give a concession"}
      againLabel="Change it again"
      submitLabel="Save concession"
    >
      {(fe) => (
        <>
          <input type="hidden" name="clientId" value={clientId} />
          <div style={grid}>
            <div>
              <label htmlFor="c-label" style={lbl}>Name the client sees</label>
              <input id="c-label" name="label" placeholder={DEFAULT_CONCESSION_LABEL} maxLength={60} style={input} />
              <Err fe={fe} name="label" />
            </div>
            <div>
              <label htmlFor="c-maxUses" style={lbl}>Number of purchases (optional)</label>
              <input id="c-maxUses" name="maxUses" inputMode="numeric" placeholder="No limit" style={input} />
              <Err fe={fe} name="maxUses" />
            </div>
          </div>
          <AmountFields kind="client" plans={plans} fe={fe} />
          <div style={grid}>
            <ReasonField id="c-reason" fe={fe} />
            <NoteField id="c-note" fe={fe} />
          </div>
          {hasConcession && <p style={{ ...hint, margin: 0 }}>Saving this ends the client&apos;s current concession.</p>}
        </>
      )}
    </Panel>
  );
}

/** Ending something takes a second click, without a browser pop-up. */
export function EndDiscountButton({ discountId, kind }: { discountId: string; kind: "client" | "code" }) {
  const { state, pending, onSubmit } = useDiscountAction(kind === "client" ? endConcession : turnOffCode);
  const [armed, setArmed] = React.useState(false);
  if (state.status === "ok") return <Result state={state} />;
  return (
    <form onSubmit={onSubmit} style={{ display: "inline-flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <input type="hidden" name="discountId" value={discountId} />
      {armed ? (
        <>
          <button className="pill" disabled={pending} style={{ padding: "6px 14px", fontSize: 12.5, background: "var(--a-danger)", color: "#fff", border: "none", opacity: pending ? 0.6 : 1 }}>
            {pending ? "Ending…" : kind === "client" ? "Yes, end it now" : "Yes, turn it off"}
          </button>
          <button type="button" style={{ ...linkButton, color: "var(--muted)", fontSize: 12.5 }} onClick={() => setArmed(false)}>
            Keep it
          </button>
        </>
      ) : (
        <button type="button" style={{ ...linkButton, color: "var(--a-danger)", fontSize: 12.5 }} onClick={() => setArmed(true)}>
          {kind === "client" ? "End concession" : "Turn off"}
        </button>
      )}
      <Result state={state} />
    </form>
  );
}

/* ------------------------------------------------------------------ codes */

export function CodeForm({ plans }: { plans: PlanPrice[] }) {
  return (
    <Panel fn={createCode} openLabel="New code" againLabel="Create another code" submitLabel="Create code">
      {(fe) => (
        <>
          <div style={grid}>
            <div>
              <label htmlFor="k-code" style={lbl}>Code</label>
              <input id="k-code" name="code" placeholder="WELCOME10" maxLength={24} autoCapitalize="characters" style={{ ...input, textTransform: "uppercase" }} />
              <p style={hint}>Letters and numbers only.</p>
              <Err fe={fe} name="code" />
            </div>
            <div>
              <label htmlFor="k-label" style={lbl}>Name the client sees</label>
              <input id="k-label" name="label" placeholder="Welcome discount" maxLength={60} style={input} />
              <Err fe={fe} name="label" />
            </div>
          </div>
          <AmountFields kind="code" plans={plans} fe={fe} />
          <div style={grid}>
            <div>
              <label htmlFor="k-startsOn" style={lbl}>Starts (optional)</label>
              <input id="k-startsOn" name="startsOn" type="date" style={input} />
              <Err fe={fe} name="startsOn" />
            </div>
            <div>
              <label htmlFor="k-maxUses" style={lbl}>Total uses (optional)</label>
              <input id="k-maxUses" name="maxUses" inputMode="numeric" placeholder="No limit" style={input} />
              <Err fe={fe} name="maxUses" />
            </div>
            <div>
              <label htmlFor="k-perClient" style={lbl}>Uses per client</label>
              <input id="k-perClient" name="maxUsesPerClient" inputMode="numeric" defaultValue="1" style={input} />
              <Err fe={fe} name="maxUsesPerClient" />
            </div>
          </div>
          <NoteField id="k-note" fe={fe} />
          <p style={{ ...hint, margin: 0 }}>A code can never make anything free. To give something free, use a concession or Free sessions on the client&apos;s record.</p>
        </>
      )}
    </Panel>
  );
}

/* ---------------------------------------------------------- free sessions */

export function FreeSessionsForm({ clientId }: { clientId: string }) {
  const [what, setWhat] = React.useState("");
  return (
    <Panel fn={addFreeSessions} openLabel="Add free sessions" againLabel="Add more" submitLabel="Add to their account">
      {(fe) => (
        <>
          <input type="hidden" name="clientId" value={clientId} />
          <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
            <legend style={{ ...lbl, padding: 0 }}>What to give</legend>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { value: "consultation", label: "The Initial Wellbeing Consultation" },
                { value: "session", label: "Wellbeing support sessions" },
              ].map((o) => (
                <label key={o.value} style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 14, color: "var(--ink)", cursor: "pointer" }}>
                  <input type="radio" name="what" value={o.value} checked={what === o.value} onChange={() => setWhat(o.value)} />
                  {o.label}
                </label>
              ))}
            </div>
            <Err fe={fe} name="what" />
          </fieldset>
          <div style={grid}>
            {what === "session" && (
              <div>
                <label htmlFor="f-count" style={lbl}>How many sessions</label>
                <input id="f-count" name="count" inputMode="numeric" defaultValue="1" style={input} />
                <p style={hint}>1 to 12. They last as long as a bought session.</p>
                <Err fe={fe} name="count" />
              </div>
            )}
            <ReasonField id="f-reason" fe={fe} />
            <NoteField id="f-note" fe={fe} />
          </div>
          <p style={{ ...hint, margin: 0 }}>The client is emailed that sessions were added, with no amounts or reasons.</p>
        </>
      )}
    </Panel>
  );
}
