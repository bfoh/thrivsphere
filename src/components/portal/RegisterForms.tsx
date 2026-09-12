"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { PillButton } from "@/components/PillButton";
import { Icon } from "@/components/icons";
import {
  confirmAgeAndRegister,
  recordConsents,
  submitIntake,
} from "@/app/actions/onboarding";
import { initialOnboardingState } from "@/lib/onboarding-state";

const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--navy)" };
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
const err: React.CSSProperties = { margin: 0, fontSize: 12, fontWeight: 600, color: "#b4553f" };
const hint: React.CSSProperties = { margin: 0, fontSize: 12.5, color: "var(--navy-soft)", lineHeight: 1.5 };

function Banner({ message }: { message: string }) {
  return (
    <p
      role="alert"
      style={{
        margin: 0,
        padding: "11px 14px",
        borderRadius: 10,
        background: "rgba(180,85,63,0.1)",
        border: "1px solid rgba(180,85,63,0.3)",
        fontSize: 13.5,
        lineHeight: 1.5,
        color: "#8c3f2e",
      }}
    >
      {message}
    </p>
  );
}

function Field({
  name,
  labelText,
  type = "text",
  placeholder,
  error,
  hintText,
  required,
}: {
  name: string;
  labelText: string;
  type?: string;
  placeholder?: string;
  error?: string;
  hintText?: string;
  required?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={name} style={label}>
        {labelText}
        {!required && <span style={{ fontWeight: 500, color: "var(--navy-soft)" }}> (optional)</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        style={{ ...input, borderColor: error ? "#c86b52" : "rgba(31,58,95,0.18)" }}
      />
      {hintText && <p style={hint}>{hintText}</p>}
      {error && <p style={err}>{error}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- step 1 */

/**
 * The 18+ gate.
 *
 * Asks for a date of birth as well as a confirmation. The server computes the
 * age and decides — the checkbox on its own would not be a gate.
 */
export function AgeGateForm() {
  const [state, action, pending] = useActionState(confirmAgeAndRegister, initialOnboardingState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="card" style={{ padding: 30, display: "flex", flexDirection: "column", gap: 16 }}>
      {state.status === "error" && !Object.keys(fe).length && <Banner message={state.message} />}

      <Field
        name="preferredName"
        labelText="What should we call you?"
        placeholder="First name is fine"
        error={fe.preferredName}
        required
      />
      <Field
        name="dateOfBirth"
        labelText="Date of birth"
        type="date"
        error={fe.dateOfBirth}
        hintText="We ask because ThrivSphere is only able to support adults aged 18 and over."
        required
      />

      <div>
        <label htmlFor="confirmAdult" style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, color: "var(--ink)", lineHeight: 1.55 }}>
          <input id="confirmAdult" name="confirmAdult" type="checkbox" style={{ marginTop: 3 }} />
          <span>I confirm I am aged 18 or over.</span>
        </label>
        {fe.confirmAdult && <p style={{ ...err, marginTop: 6 }}>{fe.confirmAdult}</p>}
      </div>

      <div className="cta-stack" style={{ display: "flex" }}>
        <PillButton variant="gold" size="lg" type="submit" disabled={pending} icon={pending ? undefined : "arrow"}>
          {pending ? "Saving…" : "Continue"}
        </PillButton>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- step 2 */

const SUPPORT_AREAS = [
  "Relationship or marital difficulties",
  "Emotional distress",
  "Stress and anxiety",
  "Low mood",
  "Domestic abuse or an unhealthy relationship",
  "A life change",
  "Confidence and resilience",
  "I'm not sure yet",
];

export function IntakeForm() {
  const [state, action, pending] = useActionState(submitIntake, initialOnboardingState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="card" style={{ padding: 30, display: "flex", flexDirection: "column", gap: 18 }}>
      {state.status === "error" && !Object.keys(fe).length && <Banner message={state.message} />}

      <p
        style={{
          margin: 0,
          padding: "12px 15px",
          borderRadius: 10,
          background: "rgba(79,168,168,0.1)",
          fontSize: 13.5,
          lineHeight: 1.6,
          color: "var(--ink)",
        }}
      >
        Share only what feels comfortable. You can leave anything blank and tell us in your own
        time. Nothing here is a test, and there are no wrong answers.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="presentingConcern" style={label}>
          What brings you to ThrivSphere?
        </label>
        <textarea
          id="presentingConcern"
          name="presentingConcern"
          rows={4}
          placeholder="A few words in your own words."
          style={{ ...input, resize: "vertical", borderColor: fe.presentingConcern ? "#c86b52" : "rgba(31,58,95,0.18)" }}
        />
        {fe.presentingConcern && <p style={err}>{fe.presentingConcern}</p>}
      </div>

      <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
        <legend style={{ ...label, padding: 0, marginBottom: 8 }}>
          Which of these feel relevant right now?
          <span style={{ fontWeight: 500, color: "var(--navy-soft)" }}> (tick any)</span>
        </legend>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SUPPORT_AREAS.map((a) => (
            <label key={a} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--ink)" }}>
              <input type="checkbox" name="supportAreas" value={a} style={{ marginTop: 3 }} />
              <span>{a}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="hopingToAchieve" style={label}>
          What would you like to be different?
          <span style={{ fontWeight: 500, color: "var(--navy-soft)" }}> (optional)</span>
        </label>
        <textarea id="hopingToAchieve" name="hopingToAchieve" rows={3} style={{ ...input, resize: "vertical" }} />
      </div>

      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field name="pronouns" labelText="Your pronouns" placeholder="e.g. she/her, he/him, they/them" />
        <Field name="genderSelfDescribed" labelText="Gender, if you'd like to say" />
      </div>

      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field name="phone" labelText="Phone number" type="tel" />
        <Field name="gpPractice" labelText="Your GP practice" hintText="Helps us signpost you if you need NHS support." />
      </div>

      <div>
        <label htmlFor="safeToContactByPhone" style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, color: "var(--ink)", lineHeight: 1.55 }}>
          <input id="safeToContactByPhone" name="safeToContactByPhone" type="checkbox" style={{ marginTop: 3 }} />
          <span>It is safe to call me or leave a voicemail on this number.</span>
        </label>
        <p style={{ ...hint, marginTop: 6 }}>
          Please leave this unticked if someone else might see or hear your messages. We will
          follow whatever you tell us here.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="contactNotes" style={label}>
          Anything we should know about contacting you safely?
          <span style={{ fontWeight: 500, color: "var(--navy-soft)" }}> (optional)</span>
        </label>
        <textarea id="contactNotes" name="contactNotes" rows={2} style={{ ...input, resize: "vertical" }} />
      </div>

      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field name="emergencyContactName" labelText="Emergency contact name" />
        <Field name="emergencyContactPhone" labelText="Emergency contact phone" type="tel" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="accessibilityNeeds" style={label}>
          Anything that would make sessions work better for you?
          <span style={{ fontWeight: 500, color: "var(--navy-soft)" }}> (optional)</span>
        </label>
        <textarea id="accessibilityNeeds" name="accessibilityNeeds" rows={2} style={{ ...input, resize: "vertical" }} />
      </div>

      <div className="cta-stack" style={{ display: "flex" }}>
        <PillButton variant="gold" size="lg" type="submit" disabled={pending} icon={pending ? undefined : "arrow"}>
          {pending ? "Saving…" : "Continue"}
        </PillButton>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- step 3 */

const CONSENT_ITEMS = [
  {
    name: "terms",
    title: "Terms & Conditions",
    href: "/terms",
    text: "I have read and accept the Terms & Conditions and Client Agreement.",
  },
  {
    name: "privacy",
    title: "Privacy",
    href: "/privacy",
    text: "I have read the Privacy Policy and agree to ThrivSphere handling my information as described (UK GDPR).",
  },
  {
    name: "confidentiality_limits",
    title: "Confidentiality and its limits",
    href: "/confidentiality",
    text: "I understand what I share is confidential, and that if there is a serious risk of harm to me or someone else, ThrivSphere may need to share information to keep people safe.",
  },
  {
    name: "consent_to_support",
    title: "Consent to support",
    href: "/consent",
    text: "I understand ThrivSphere is a non-clinical wellbeing service — not therapy, diagnosis, treatment, or a crisis service — and I consent to receiving support on that basis.",
  },
];

export function ConsentForm() {
  const [state, action, pending] = useActionState(recordConsents, initialOnboardingState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="card" style={{ padding: 30, display: "flex", flexDirection: "column", gap: 18 }}>
      {state.status === "error" && <Banner message={state.message} />}

      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--ink)" }}>
        Please read each of these. They are short, and they matter — you can open any of them in a
        new tab.
      </p>

      {CONSENT_ITEMS.map((c) => (
        <div key={c.name}>
          <label
            htmlFor={c.name}
            style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--ink)", lineHeight: 1.6 }}
          >
            <input id={c.name} name={c.name} type="checkbox" style={{ marginTop: 4 }} />
            <span>
              {c.text}{" "}
              <Link href={c.href} target="_blank" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
                Read {c.title}
              </Link>
            </span>
          </label>
          {fe[c.name] && <p style={{ ...err, marginTop: 6 }}>{fe[c.name]}</p>}
        </div>
      ))}

      <div
        style={{
          background: "var(--navy)",
          borderRadius: 12,
          padding: "16px 18px",
          color: "#e7eefa",
          fontSize: 13.5,
          lineHeight: 1.6,
          display: "flex",
          gap: 10,
        }}
      >
        <span style={{ flex: "0 0 auto", marginTop: 1 }}>
          <Icon name="shield" size={18} stroke="var(--gold)" />
        </span>
        <span>
          ThrivSphere is not an emergency or crisis service. If you need help right now, call{" "}
          <strong style={{ color: "#fff" }}>999</strong> or Samaritans on{" "}
          <strong style={{ color: "#fff" }}>116 123</strong>.
        </span>
      </div>

      <p style={hint}>
        You can withdraw your consent at any time, without explaining why — just email us.
      </p>

      <div className="cta-stack" style={{ display: "flex" }}>
        <PillButton variant="gold" size="lg" type="submit" disabled={pending} icon={pending ? undefined : "arrow"}>
          {pending ? "Saving…" : "Agree and finish"}
        </PillButton>
      </div>
    </form>
  );
}
