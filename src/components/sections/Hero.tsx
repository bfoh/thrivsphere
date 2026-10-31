"use client";

import Image from "next/image";
import { Section } from "../Section";
import { PillButton } from "../PillButton";
import { Icon } from "../icons";
import { brand, homeIntro } from "@/data/site";

export function Hero() {
  return (
    <Section
      id="home"
      aura="warm"
      watermark="Wellbeing"
      background="linear-gradient(135deg,#faf9f6 0%,#eef5f2 55%,#e7f0ee 100%)"
      bleed={
        <div className="hero-bleed">
          <Image
            src="/images/people/hero-woman.png"
            alt="A person smiling, supported by ThriveSphere Wellbeing"
            width={580}
            height={750}
            priority
            sizes="(max-width: 900px) 1px, 50vw"
            style={{ height: "100%", width: "auto", objectFit: "contain", objectPosition: "bottom", filter: "drop-shadow(-16px 22px 26px rgba(31,58,95,0.2))" }}
          />
        </div>
      }
    >
      <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 48 }}>
        <div className="fadeUp" style={{ maxWidth: 600 }}>
          <span className="eyebrow">{brand.name}</span>
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
            Supporting Your Wellbeing.
            <br />
            <span style={{ color: "var(--teal-deep)" }}>Strengthening Your Resilience</span>
            <span style={{ color: "var(--gold)" }}>.</span>
          </h1>

          {/* mobile-only hero cutout — gradient panel, figure bleeds up from bottom */}
          <div className="hero-mobile-visual">
            <Image
              src="/images/people/hero-woman.png"
              alt="A person smiling, supported by ThriveSphere Wellbeing"
              width={580}
              height={750}
              sizes="(max-width: 900px) 95vw, 1px"
            />
            <span className="hero-mobile-badge">
              <Icon name="shield" size={15} stroke="var(--teal-deep)" />
              Registered Mental Health Nurses
            </span>
          </div>

          {/* The rest of the introduction opens the About section. */}
          <p style={{ margin: "22px 0 0", fontSize: 17.5, lineHeight: 1.6, maxWidth: 540, color: "var(--ink)" }}>
            {homeIntro.paragraphs[0]}
          </p>
          <div className="cta-stack" style={{ display: "flex", gap: 14, marginTop: 30, flexWrap: "wrap" }}>
            <PillButton variant="gold" size="lg" href="/book" icon="arrow">
              Book an Appointment
            </PillButton>
            <PillButton variant="ghost" size="lg" href="/services">
              Our Services
            </PillButton>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 24, color: "var(--teal-deep)", fontSize: 13.5, fontWeight: 600, maxWidth: 540, lineHeight: 1.5 }}>
            <span style={{ flex: "0 0 auto", marginTop: 1 }}>
              <Icon name="shield" size={18} stroke="var(--teal-deep)" />
            </span>
            <span>{brand.availabilityLine}</span>
          </div>
        </div>
      </div>
    </Section>
  );
}
