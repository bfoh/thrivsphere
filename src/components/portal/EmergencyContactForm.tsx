"use client";

import * as React from "react";
import { useActionState } from "react";
import { PillButton } from "@/components/PillButton";
import { saveEmergencyContact, type EmergencyContactState } from "@/app/actions/emergency-contact";
import { ANSWERS, EXPLANATION, HEADING, INFORMED_ACK, LIMITS, METHODS, NOT_ENTITLED, RELATIONSHIPS } from "@/lib/emergency-contact";

const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--navy)", display: "block", marginBottom: 6 };
const input: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 14.5,
  padding: "11px 13px",
  borderRadius: 10,
  border: "1px solid rgba(31,58,95,0.18)",
  background: "#fff",
  color: "var(--ink)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const hint: React.CSSProperties = { margin: "6px 0 0", fontSize: 12.5, color: "var(--navy-soft)", lineHeight: 1.5 };
const errStyle: React.CSSProperties = { margin: "6px 0 0", fontSize: 12, fontWeight: 600, color: "#b4553f" };
const choice: React.CSSProperties = { display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--ink)", lineHeight: 1.5 };

export type EmergencyContactValues = {
  status: string | null;
  name: string | null;
  relationship: string | null;
  phone: string | null;
  alt: string | null;
  country: string | null;
  timeZone: string | null;
  method: string | null;
  methodOther: string | null;
  informed: boolean | null;
};

function Err({ fe, name }: { fe: Record<string, string>; name: string }) {
  return fe[name] ? <p role="alert" style={errStyle}>{fe[name]}</p> : null;
}

const initial: EmergencyContactState = { status: "idle", message: "" };

/** The Emergency Contact / Next of Kin form (IT handover §15.2–15.3). */
export function EmergencyContactForm({ values, from }: { values: EmergencyContactValues; from: "book" | "details" }) {
  const [state, action, pending] = useActionState(saveEmergencyContact, initial);
  const [, startTransition] = React.useTransition();
  const [answer, setAnswer] = React.useState(values.status ?? "");
  const [method, setMethod] = React.useState(values.method ?? "");
  const [zones, setZones] = React.useState<string[]>([]);
  const fe = state.fieldErrors ?? {};

  // The time-zone list comes from the browser, the first time the field is used.
  const loadZones = () => {
    if (zones.length) return;
    try {
      setZones((Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone"));
    } catch {
      // An older browser: the field still takes typed text.
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      noValidate
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <input type="hidden" name="from" value={from} />
      <div>
        <h2 style={{ margin: "0 0 10px", fontSize: 21, color: "var(--navy)" }}>{HEADING}</h2>
        <p style={{ margin: "0 0 10px", fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)" }}>{EXPLANATION}</p>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--navy-soft)" }}>{NOT_ENTITLED}</p>
      </div>

      <div role="radiogroup" aria-labelledby="ec-answer">
        <p id="ec-answer" style={label}>Would you like to give an emergency contact?</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ANSWERS.map((a) => (
            <label key={a.key} style={choice}>
              <input type="radio" name="answer" value={a.key} checked={answer === a.key} onChange={() => setAnswer(a.key)} style={{ marginTop: 4 }} />
              {a.label}
            </label>
          ))}
        </div>
        <Err fe={fe} name="answer" />
        {(answer === "unable" || answer === "prefer_not") && (
          <p style={hint}>That&apos;s fine, and it won&apos;t stop you booking. You can add someone at any time from <strong>Your details</strong>.</p>
        )}
      </div>

      {answer === "provided" && (
        <>
          <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label htmlFor="ec-name" style={label}>Contact full name</label>
              <input id="ec-name" name="name" defaultValue={values.name ?? ""} maxLength={120} autoComplete="off" style={input} />
              <Err fe={fe} name="name" />
            </div>
            <div>
              <label htmlFor="ec-relationship" style={label}>Relationship to you</label>
              <input id="ec-relationship" name="relationship" list="ec-relationships" defaultValue={values.relationship ?? ""} maxLength={80} autoComplete="off" style={input} placeholder="e.g. Sister, Friend" />
              <datalist id="ec-relationships">
                {RELATIONSHIPS.map((r) => <option key={r} value={r} />)}
              </datalist>
              <Err fe={fe} name="relationship" />
            </div>
          </div>

          <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label htmlFor="ec-phone" style={label}>Phone number</label>
              <input id="ec-phone" name="phone" type="tel" defaultValue={values.phone ?? ""} maxLength={40} autoComplete="off" style={input} placeholder="+44 7700 900123" />
              <p style={hint}>Include the international dialling code, for example +44 for the UK.</p>
              <Err fe={fe} name="phone" />
            </div>
            <div>
              <label htmlFor="ec-alt" style={label}>
                Alternative phone or email <span style={{ fontWeight: 500, color: "var(--navy-soft)" }}>(optional)</span>
              </label>
              <input id="ec-alt" name="alt" defaultValue={values.alt ?? ""} maxLength={160} autoComplete="off" style={input} />
              <Err fe={fe} name="alt" />
            </div>
          </div>

          <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label htmlFor="ec-country" style={label}>Country</label>
              <input id="ec-country" name="country" defaultValue={values.country ?? ""} maxLength={80} autoComplete="off" style={input} placeholder="e.g. United Kingdom" />
              <p style={hint}>Where they live. They may not be in the same country as you.</p>
              <Err fe={fe} name="country" />
            </div>
            <div>
              <label htmlFor="ec-timeZone" style={label}>
                Time zone <span style={{ fontWeight: 500, color: "var(--navy-soft)" }}>(if known)</span>
              </label>
              <input id="ec-timeZone" name="timeZone" list="ec-zones" onFocus={loadZones} defaultValue={values.timeZone ?? ""} maxLength={64} autoComplete="off" style={input} placeholder="e.g. Europe/London" />
              <datalist id="ec-zones">
                {zones.map((z) => <option key={z} value={z} />)}
              </datalist>
              <Err fe={fe} name="timeZone" />
            </div>
          </div>

          <div role="radiogroup" aria-labelledby="ec-method">
            <p id="ec-method" style={label}>Preferred contact method</p>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {METHODS.map((m) => (
                <label key={m.key} style={choice}>
                  <input type="radio" name="method" value={m.key} checked={method === m.key} onChange={() => setMethod(m.key)} style={{ marginTop: 4 }} />
                  {m.label}
                </label>
              ))}
            </div>
            {method === "other" && (
              <input name="methodOther" aria-label="Other contact method" defaultValue={values.methodOther ?? ""} maxLength={120} style={{ ...input, marginTop: 8 }} />
            )}
            <Err fe={fe} name="method" />
            <Err fe={fe} name="methodOther" />
          </div>

          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "var(--ink)", background: "rgba(79,168,168,0.08)", borderRadius: 10, padding: "10px 14px" }}>{LIMITS}</p>

          <div>
            <label style={choice}>
              <input type="checkbox" name="informed" defaultChecked={false} style={{ marginTop: 4 }} />
              <span>{INFORMED_ACK}</span>
            </label>
            <Err fe={fe} name="informed" />
          </div>
        </>
      )}

      {state.status === "error" && !Object.keys(fe).length && <p role="alert" style={errStyle}>{state.message}</p>}
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <PillButton variant="gold" size="lg" type="submit" disabled={pending || !answer} icon={pending ? undefined : "arrow"}>
          {pending ? "Saving…" : from === "book" ? "Save and choose a time" : "Save"}
        </PillButton>
        {state.status === "ok" && <p role="status" style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--teal-deep)" }}>{state.message}</p>}
        {state.status === "error" && Object.keys(fe).length > 0 && <p role="alert" style={{ ...errStyle, margin: 0 }}>{state.message}</p>}
      </div>
    </form>
  );
}
