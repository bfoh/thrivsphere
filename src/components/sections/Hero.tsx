"use client";

import { Section } from "../Section";
import { PillButton } from "../PillButton";
import { Icon } from "../icons";
import { audience } from "@/data/site";

export function Hero({ onNavigate }: { onNavigate: (id: string) => void }) {
  return (
    <Section
      id="home"
      aura="warm"
      watermark="Wellbeing"
      background="linear-gradient(135deg,#faf9f6 0%,#eef5f2 55%,#e7f0ee 100%)"
      bleed={
        <div className="hero-bleed">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/people/hero-woman.png"
            alt="A smiling woman supported by ThrivSphere Wellbeing"
            style={{ height: "100%", width: "auto", objectFit: "contain", objectPosition: "bottom", filter: "drop-shadow(-16px 22px 26px rgba(31,58,95,0.2))" }}
          />
        </div>
      }
    >
      <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 48 }}>
        <div className="fadeUp" style={{ maxWidth: 600 }}>
          <span className="eyebrow">ThrivSphere Wellbeing CIC</span>
          <h1
            className="hero-title"
            style={{
              margin: "18px 0 0",
              fontSize: 56,
              lineHeight: 1.04,
              fontWeight: 800,
              letterSpacing: "-0.015em",
              color: "var(--navy)",
            }}
          >
            Empowering Wellbeing.
            <br />
            Building Resilience.
            <br />
            <span style={{ color: "var(--teal-deep)" }}>Inspiring Hope</span>
            <span style={{ color: "var(--gold)" }}>.</span>
          </h1>

          {/* mobile-only hero cutout — gradient panel, figure bleeds up from bottom */}
          <div className="hero-mobile-visual">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/people/hero-woman.png"
              alt="A smiling woman supported by ThrivSphere Wellbeing"
            />
            <span className="hero-mobile-badge">
              <Icon name="shield" size={15} stroke="var(--teal-deep)" />
              100% confidential
            </span>
          </div>

          <p style={{ margin: "22px 0 0", fontSize: 17.5, lineHeight: 1.6, maxWidth: 540, color: "var(--ink)" }}>
            A safe, confidential and compassionate online space where women experiencing emotional
            abuse, anxiety, isolation or life transitions can access wellbeing support, coaching,
            mindfulness and community — from anywhere in the UK.
          </p>
          <div className="cta-stack" style={{ display: "flex", gap: 14, marginTop: 30, flexWrap: "wrap" }}>
            <PillButton variant="gold" size="lg" onClick={() => onNavigate("support")} icon="arrow">
              Book a Session
            </PillButton>
            <PillButton variant="ghost" size="lg" onClick={() => onNavigate("services")}>
              Explore our services
            </PillButton>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 24, color: "var(--teal-deep)", fontSize: 13.5, fontWeight: 600 }}>
            <Icon name="shield" size={18} stroke="var(--teal-deep)" />
            100% confidential · Registered Mental Health Nurse led
          </div>
        </div>

      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 44, maxWidth: 900 }} className="hero-chips hide-mobile">
        {audience.slice(0, 8).map((a) => (
          <span className="chip chip-dot" key={a}>
            {a}
          </span>
        ))}
      </div>
    </Section>
  );
}
