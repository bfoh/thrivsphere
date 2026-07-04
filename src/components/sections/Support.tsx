"use client";

import { useState } from "react";
import { Section } from "../Section";
import { Icon } from "../icons";
import { PillButton } from "../PillButton";
import { FancyHeadline } from "../FancyHeadline";
import { impact } from "@/data/site";

const GOLD = "#bd951f";
const TEAL = "#3d8a8a";
const NAVY = "#1f3a5f";

export function Support() {
  const [sent, setSent] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  return (
    <Section
      id="support"
      aura="warm"
      watermark="Contact"
      background="linear-gradient(135deg,#faf9f6 0%,#eef5f2 100%)"
      bleed={
        <div className="bleed-right">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/people/support-woman.png"
            alt="A warm, reassuring ThrivSphere wellbeing practitioner"
            style={{ height: "100%", width: "auto", objectFit: "contain", objectPosition: "bottom", filter: "drop-shadow(-16px 22px 26px rgba(31,58,95,0.2))" }}
          />
        </div>
      }
    >
      <div style={{ maxWidth: 720, width: "100%", alignSelf: "flex-start", marginRight: "auto", position: "relative", zIndex: 1 }}>
      <FancyHeadline
        lines={[
          [{ t: "start your", size: 16, italic: true, color: GOLD }],
          [{ t: "JOURNEY", size: 50, weight: 800, color: NAVY }],
          [
            { t: "reach out", size: 18, italic: true, color: TEAL },
            { t: "TODAY", size: 30, weight: 800, color: NAVY },
          ],
        ]}
      />
      <p style={{ margin: "14px 0 0", fontSize: 17, lineHeight: 1.6, maxWidth: 640, color: "var(--ink)" }}>
        Reach out in confidence. Tell us a little about what you&apos;re looking for and we&apos;ll be
        in touch to arrange your session.
      </p>

      <div className="support-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 24, marginTop: 32 }}>
        {/* enquiry form */}
        <div className="card" style={{ padding: 30 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 20, color: "var(--navy)" }}>Book a session or ask a question</h3>
          <p style={{ margin: "0 0 18px", fontSize: 13.5, color: "var(--navy-soft)" }}>
            Confidential · usually answered within 2 working days
          </p>
          {sent ? (
            <div style={{ padding: "26px 20px", textAlign: "center", background: "rgba(79,168,168,0.1)", borderRadius: 12, color: "var(--teal-deep)" }}>
              <Icon name="check" size={34} stroke="var(--teal-deep)" />
              <p style={{ margin: "10px 0 0", fontWeight: 700 }}>Thank you — your message is on its way.</p>
              <p style={{ margin: "4px 0 0", fontSize: 13.5 }}>We&apos;ll reply to you privately and with care.</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <Field label="Your name" name="name" placeholder="First name is fine" />
              <Field label="Email" name="email" type="email" placeholder="you@email.com" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={labelStyle}>What would you like support with?</label>
                <select style={inputStyle} defaultValue="">
                  <option value="" disabled>
                    Choose a service…
                  </option>
                  <option>One-to-One Emotional Wellbeing Support</option>
                  <option>Wellbeing Coaching</option>
                  <option>Women&apos;s Wellbeing Circle</option>
                  <option>Mindfulness Sessions</option>
                  <option>Workplace Wellbeing</option>
                  <option>Something else</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={labelStyle}>Your message</label>
                <textarea rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Share only what you feel comfortable with." />
              </div>
              <label style={{ display: "flex", gap: 8, fontSize: 12.5, color: "var(--navy-soft)", alignItems: "flex-start" }}>
                <input type="checkbox" required style={{ marginTop: 3 }} />
                <span>I agree to ThrivSphere handling my details in line with its Privacy &amp; Confidentiality policies (UK GDPR).</span>
              </label>
              <div className="cta-stack" style={{ display: "flex" }}>
                <PillButton variant="gold" size="lg" icon="arrow">
                  Send securely
                </PillButton>
              </div>
            </form>
          )}
        </div>

        {/* right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="heart" size={20} stroke="var(--gold)" /> Support the CIC
            </h3>
            <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.55, color: "var(--ink)" }}>
              As a Community Interest Company, every donation helps us keep wellbeing support
              accessible to women who need it most.
            </p>
            <PillButton variant="teal" size="sm" icon="heart">
              Make a donation
            </PillButton>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="mail" size={20} stroke="var(--teal)" /> Wellbeing newsletter
            </h3>
            {subscribed ? (
              <p style={{ margin: 0, fontSize: 14, color: "var(--teal-deep)", fontWeight: 600 }}>
                You&apos;re in — welcome to the community. 💛
              </p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubscribed(true);
                }}
                style={{ display: "flex", gap: 8 }}
              >
                <input type="email" required placeholder="Your email" style={{ ...inputStyle, flex: 1 }} />
                <PillButton variant="gold" size="sm">
                  Join
                </PillButton>
              </form>
            )}
          </div>

          <div
            style={{
              background: "var(--navy)",
              borderRadius: 16,
              padding: 22,
              color: "#e7eefa",
            }}
          >
            <h3 style={{ margin: "0 0 10px", fontSize: 15, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="shield" size={18} stroke="var(--gold)" /> Emergency support
            </h3>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 13.5, lineHeight: 1.7 }}>
              <li>Immediate danger — <strong style={{ color: "#fff" }}>999</strong></li>
              <li>Samaritans (24/7) — <strong style={{ color: "#fff" }}>116 123</strong></li>
              <li>National DA Helpline — <strong style={{ color: "#fff" }}>0808 2000 247</strong></li>
            </ul>
          </div>
        </div>
      </div>

      {/* impact row */}
      <div className="impact-row" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginTop: 34 }}>
        {impact.map((i) => (
          <div key={i.label} style={{ textAlign: "center", padding: "16px 10px", background: "#fff", borderRadius: 14, border: "1px solid rgba(31,58,95,0.08)" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--teal-deep)" }}>{i.stat}</div>
            <div style={{ fontSize: 12.5, color: "var(--navy-soft)", marginTop: 4 }}>{i.label}</div>
          </div>
        ))}
      </div>
      </div>
    </Section>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  color: "var(--navy)",
};

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

function Field({
  label,
  name,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={name} style={labelStyle}>
        {label}
      </label>
      <input id={name} name={name} type={type} required placeholder={placeholder} style={inputStyle} />
    </div>
  );
}
