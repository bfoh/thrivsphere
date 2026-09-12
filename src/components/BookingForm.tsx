"use client";

import * as React from "react";
import { useActionState } from "react";
import { Icon } from "./icons";
import { PillButton } from "./PillButton";
import { submitEnquiry } from "@/app/actions/enquiry";
import { initialEnquiryState } from "@/lib/enquiry-state";
import Link from "next/link";

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
};
const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: "var(--navy)" };
const errorStyle: React.CSSProperties = { margin: 0, fontSize: 12, fontWeight: 600, color: "#b4553f" };

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

/**
 * Consultation request form.
 *
 * This sends a booking *request* — real self-serve booking with payment and
 * live availability arrives with the Stage 2 client portal. Until then the
 * copy is explicit that a person will confirm the appointment by reply.
 */
export function BookingForm() {
  const [state, formAction, pending] = useActionState(submitEnquiry, initialEnquiryState);

  if (state.status === "ok") {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <div
          style={{
            width: 64,
            height: 64,
            margin: "0 auto 14px",
            borderRadius: "50%",
            background: "rgba(79,168,168,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="check" size={34} stroke="var(--teal-deep)" />
        </div>
        <h2 style={{ margin: 0, fontSize: 22, color: "var(--navy)" }}>
          Thank you — we&apos;ve got your request
        </h2>
        <p style={{ margin: "10px auto 0", maxWidth: 440, fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
          We&apos;ll reply privately, usually within 2 working days, to arrange your session. If you
          need urgent help before then, please use the emergency contacts above.
        </p>
      </div>
    );
  }

  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="card" style={{ padding: 30, display: "flex", flexDirection: "column", gap: 14 }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="two-col">
        <Field label="Your name" name="name" placeholder="First name is fine" error={fe.name} />
        <Field label="Email" name="email" type="email" placeholder="you@email.com" error={fe.email} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="two-col">
        <Field label="Phone (optional)" name="phone" type="tel" placeholder="Optional" error={fe.phone} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="service" style={labelStyle}>
            Service
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
      </div>
      <Field
        label="Preferred days / times"
        name="preferred"
        placeholder="e.g. weekday evenings, Saturday mornings"
        error={fe.preferred}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="message" style={labelStyle}>
          How can we support you? (share only what feels comfortable)
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="A few words about what you're looking for."
        />
        {fe.message && <p style={errorStyle}>{fe.message}</p>}
      </div>

      {/* honeypot */}
      <div aria-hidden style={{ position: "absolute", left: "-9999px" }}>
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label
          htmlFor="consent"
          style={{ display: "flex", gap: 8, fontSize: 12.5, color: "var(--navy-soft)", alignItems: "flex-start" }}
        >
          <input id="consent" name="consent" type="checkbox" style={{ marginTop: 3 }} />
          <span>
            I confirm I am aged 18 or over, and I agree to ThrivSphere handling my details in line
            with its{" "}
            <Link href="/privacy" style={{ color: "var(--teal-deep)", fontWeight: 600 }}>
              Privacy
            </Link>{" "}
            &amp;{" "}
            <Link href="/confidentiality" style={{ color: "var(--teal-deep)", fontWeight: 600 }}>
              Confidentiality
            </Link>{" "}
            policies (UK GDPR).
          </span>
        </label>
        {fe.consent && <p style={{ ...errorStyle, marginTop: 5 }}>{fe.consent}</p>}
      </div>

      <div className="cta-stack" style={{ display: "flex" }}>
        <PillButton variant="gold" size="lg" type="submit" disabled={pending} icon={pending ? undefined : "arrow"}>
          {pending ? "Sending…" : "Send my request securely"}
        </PillButton>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: "var(--navy-soft)", textAlign: "center" }}>
        🔒 Confidential · This is a request form, not a live booking. We&apos;ll confirm your session
        by email.
      </p>
    </form>
  );
}
