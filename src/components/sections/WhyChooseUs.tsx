"use client";

import { Section } from "../Section";
import { Icon } from "../icons";
import { PillButton } from "../PillButton";
import { FancyHeadline } from "../FancyHeadline";
import { bookCta, whatToExpect, whyChooseUs } from "@/data/site";

const GOLD = "#bd951f";
const NAVY = "#1f3a5f";

/**
 * "Why choose ThriveSphere Wellbeing?" (launch checklist, website content §1):
 * straight after the service overview and above a booking button, with the
 * short link to "What to expect in your sessions" on Our Services.
 */
export function WhyChooseUs() {
  return (
    <Section id="why-choose-us" aura="warm" watermark="Why us">
      <FancyHeadline
        lines={[
          [{ t: "why choose", size: 17, italic: true, color: GOLD }],
          [{ t: "ThriveSphere Wellbeing?", size: 46, weight: 800, color: NAVY }],
        ]}
      />
      <ul
        className="services-grid"
        style={{ listStyle: "none", margin: "30px 0 0", padding: 0, display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 16 }}
      >
        {whyChooseUs.points.map((p) => (
          <li key={p.text} className="mv-card" style={{ padding: "22px 20px" }}>
            <span
              className="mv-icon"
              aria-hidden
              style={{
                width: 46,
                height: 46,
                borderRadius: 13,
                background: "var(--grad-teal)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 18px rgba(79,168,168,0.42)",
                marginBottom: 14,
              }}
            >
              <Icon name={p.icon} size={23} stroke="#fff" />
            </span>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, fontWeight: 600, color: "var(--navy)" }}>{p.text}</p>
          </li>
        ))}
      </ul>
      <div className="cta-stack" style={{ marginTop: 30, display: "flex", gap: 14, flexWrap: "wrap" }}>
        <PillButton variant="gold" size="lg" href={bookCta.href} icon="arrow">
          {bookCta.label}
        </PillButton>
        <PillButton variant="ghost" size="lg" href={`/services#${whatToExpect.id}`}>
          {whatToExpect.eyebrow}
        </PillButton>
      </div>
    </Section>
  );
}
