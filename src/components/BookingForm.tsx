"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { PillButton } from "./PillButton";

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
};
const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: "var(--navy)" };

function Field({ label, name, type = "text", placeholder, required = true }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={name} style={labelStyle}>
        {label}
      </label>
      <input id={name} name={name} type={type} required={required} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}

export function BookingForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, margin: "0 auto 14px", borderRadius: "50%", background: "rgba(79,168,168,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={34} stroke="var(--teal-deep)" />
        </div>
        <h3 style={{ margin: 0, fontSize: 22, color: "var(--navy)" }}>Thank you — we&apos;ve got your request</h3>
        <p style={{ margin: "10px auto 0", maxWidth: 440, fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
          Our Client Care Specialist will reply privately, usually within 2 working days, to arrange your session. If
          you need urgent help before then, please use the emergency contacts above.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      className="card"
      style={{ padding: 30, display: "flex", flexDirection: "column", gap: 14 }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="two-col">
        <Field label="Your name" name="name" placeholder="First name is fine" />
        <Field label="Email" name="email" type="email" placeholder="you@email.com" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="two-col">
        <Field label="Phone (optional)" name="phone" type="tel" placeholder="Optional" required={false} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={labelStyle}>Service</label>
          <select style={inputStyle} defaultValue="">
            <option value="" disabled>
              Choose a service…
            </option>
            <option>One-to-One Emotional Wellbeing Support</option>
            <option>Wellbeing Coaching</option>
            <option>Women&apos;s Wellbeing Circle</option>
            <option>Mindfulness Sessions</option>
            <option>Resilience Programme</option>
            <option>Workplace Wellbeing</option>
            <option>Not sure yet</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={labelStyle}>Preferred days / times</label>
        <input style={inputStyle} placeholder="e.g. weekday evenings, Saturday mornings" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={labelStyle}>How can we support you? (share only what feels comfortable)</label>
        <textarea rows={4} style={{ ...inputStyle, resize: "vertical" }} placeholder="A few words about what you're looking for." />
      </div>
      <label style={{ display: "flex", gap: 8, fontSize: 12.5, color: "var(--navy-soft)", alignItems: "flex-start" }}>
        <input type="checkbox" required style={{ marginTop: 3 }} />
        <span>
          I agree to ThrivSphere handling my details in line with its{" "}
          <a href="/privacy" style={{ color: "var(--teal-deep)", fontWeight: 600 }}>Privacy</a> &amp;{" "}
          <a href="/confidentiality" style={{ color: "var(--teal-deep)", fontWeight: 600 }}>Confidentiality</a> policies (UK GDPR).
        </span>
      </label>
      <div className="cta-stack" style={{ display: "flex" }}>
        <PillButton variant="gold" size="lg" icon="arrow">
          Send my request securely
        </PillButton>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: "var(--navy-soft)", textAlign: "center" }}>
        🔒 Confidential · This is a request form, not a live booking. We&apos;ll confirm your session by email.
      </p>
    </form>
  );
}
