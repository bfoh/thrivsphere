"use client";

import * as React from "react";
import { useActionState } from "react";
import { Icon } from "./icons";
import { PillButton } from "./PillButton";
import { submitEnquiry } from "@/app/actions/enquiry";
import { initialEnquiryState } from "@/lib/enquiry-state";
import Link from "next/link";

const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: "var(--navy)" };

const inputStyle: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 14,
  padding: "11px 13px",
  borderRadius: 10,
  border: "1px solid rgba(31,58,95,0.18)",
  background: "#fff",
  color: "var(--ink)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  maxWidth: "100%",
};

const errorStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  fontWeight: 600,
  color: "#b4553f",
};

/**
 * The real enquiry form, backed by a Server Action.
 *
 * Deliberately does not ask for health details — an enquiry is just enough to
 * arrange a conversation. Anything sensitive is gathered in the Stage 2 intake
 * flow, behind authentication.
 */
export function EnquiryForm() {
  const [state, formAction, pending] = useActionState(submitEnquiry, initialEnquiryState);

  if (state.status === "ok") {
    return (
      <div className="card" style={{ padding: 34, textAlign: "center" }}>
        <div
          style={{
            width: 62,
            height: 62,
            margin: "0 auto 14px",
            borderRadius: "50%",
            background: "rgba(79,168,168,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="check" size={32} stroke="var(--teal-deep)" />
        </div>
        <h2 style={{ margin: 0, fontSize: 21, color: "var(--navy)" }}>Message sent</h2>
        <p style={{ margin: "10px auto 0", maxWidth: 420, fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
          {state.message}
        </p>
      </div>
    );
  }

  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="card" style={{ padding: 30, display: "flex", flexDirection: "column", gap: 13 }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, color: "var(--navy)" }}>Send us a message</h2>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--navy-soft)" }}>
          Confidential · usually answered within 2 working days
        </p>
      </div>

      {state.status === "error" && !Object.keys(fe).length && (
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
          {state.message}
        </p>
      )}

      <Field label="Your name" name="name" placeholder="First name is fine" error={fe.name} />
      <Field label="Email" name="email" type="email" placeholder="you@email.com" error={fe.email} />

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="service" style={labelStyle}>
          What would you like support with?
        </label>
        <select id="service" name="service" style={inputStyle} defaultValue="">
          <option value="">Choose a service…</option>
          <option>One-to-One Emotional Wellbeing Support</option>
          <option>Wellbeing Coaching</option>
          <option>Wellbeing Circle (peer support group)</option>
          <option>Mindfulness Sessions</option>
          <option>Wellbeing &amp; Resilience Programme</option>
          <option>Workplace Wellbeing</option>
          <option>Not sure yet</option>
        </select>
        {fe.service && <p style={errorStyle}>{fe.service}</p>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="message" style={labelStyle}>
          Your message
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Share only what you feel comfortable with — please don't include sensitive health details here."
        />
        {fe.message && <p style={errorStyle}>{fe.message}</p>}
      </div>

      {/* honeypot — hidden from people, tempting to bots */}
      <div aria-hidden style={{ position: "absolute", left: "-9999px" }}>
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label
          htmlFor="consent"
          style={{ display: "flex", gap: 9, fontSize: 12.5, color: "var(--navy-soft)", alignItems: "flex-start" }}
        >
          <input id="consent" name="consent" type="checkbox" style={{ marginTop: 3 }} />
          <span>
            I agree to ThrivSphere handling my details in line with its{" "}
            <Link href="/privacy" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
              Privacy
            </Link>{" "}
            &amp;{" "}
            <Link href="/confidentiality" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
              Confidentiality
            </Link>{" "}
            policies (UK GDPR).
          </span>
        </label>
        {fe.consent && <p style={{ ...errorStyle, marginTop: 5 }}>{fe.consent}</p>}
      </div>

      <div className="cta-stack" style={{ display: "flex" }}>
        <PillButton variant="gold" size="lg" type="submit" disabled={pending} icon={pending ? undefined : "arrow"}>
          {pending ? "Sending…" : "Send securely"}
        </PillButton>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: "var(--navy-soft)", textAlign: "center" }}>
        🔒 This is an enquiry form, not a booking. We&apos;ll confirm everything with you by reply.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={name} style={labelStyle}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        style={{ ...inputStyle, borderColor: error ? "#c86b52" : "rgba(31,58,95,0.18)" }}
      />
      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
}
