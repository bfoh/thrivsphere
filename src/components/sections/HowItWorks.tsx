"use client";

import { Section } from "../Section";
import { PillButton } from "../PillButton";
import { FancyHeadline } from "../FancyHeadline";
import { HowItWorksSteps } from "../HowItWorksSteps";

const GOLD = "#bd951f";
const NAVY = "#1f3a5f";

export function HowItWorks() {
  return (
    <Section id="how-it-works" aura="sage" background="linear-gradient(160deg,#f2f6ee 0%,#e6efe1 100%)" watermark="Process">
      <FancyHeadline
        lines={[
          [{ t: "how our service", size: 16, italic: true, color: GOLD }],
          [{ t: "WORKS", size: 48, weight: 800, color: NAVY }],
        ]}
      />
      <div style={{ marginTop: 26, maxWidth: 860 }}>
        <HowItWorksSteps compact />
      </div>
      <div className="cta-stack" style={{ marginTop: 26, display: "flex", gap: 14, flexWrap: "wrap" }}>
        <PillButton variant="gold" size="lg" href="/book" icon="arrow">
          Book an Appointment
        </PillButton>
        <PillButton variant="ghost" size="lg" href="/pricing">
          Pricing
        </PillButton>
      </div>
    </Section>
  );
}
