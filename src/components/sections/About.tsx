"use client";

import { Section } from "../Section";
import { Icon } from "../icons";
import { FancyHeadline } from "../FancyHeadline";
import { values } from "@/data/site";

const GOLD = "#bd951f";
const TEAL = "#3d8a8a";
const NAVY = "#1f3a5f";

export function About() {
  return (
    <Section id="about" aura="sage" background="linear-gradient(160deg,#f2f6ee 0%,#e6efe1 100%)" watermark="About">
      <FancyHeadline
        lines={[
          [{ t: "who we are —", size: 17, italic: true, color: GOLD }],
          [{ t: "A TRUSTED,", size: 46, weight: 800, color: NAVY }],
          [
            { t: "accessible", size: 23, italic: true, color: TEAL },
            { t: "COMMUNITY", size: 42, weight: 800, color: NAVY },
          ],
        ]}
      />
      <p style={{ margin: "16px 0 0", fontSize: 17, lineHeight: 1.6, maxWidth: 760, color: "var(--ink)" }}>
        ThrivSphere Wellbeing CIC is a UK-based Community Interest Company with an international
        vision. We exist to improve the emotional, mental and social wellbeing of women — offering a
        confidential, compassionate and empowering environment to heal, grow and thrive.
      </p>

      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 34 }}>
        <div className="mv-card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <IconBadge name="lotus" />
            <h3 style={{ margin: 0, fontSize: 21, color: "var(--navy)" }}>Our Mission</h3>
          </div>
          <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: "var(--ink)" }}>
            To promote emotional, mental and social wellbeing through accessible education, emotional
            support, coaching, mindfulness, peer support and community connection — helping women build
            resilience, support recovery, improve confidence and create positive futures.
          </p>
        </div>
        <div className="mv-card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <IconBadge name="sun" />
            <h3 style={{ margin: 0, fontSize: 21, color: "var(--navy)" }}>Our Vision</h3>
          </div>
          <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: "var(--ink)" }}>
            To create a trusted, accessible and empowering online wellbeing community where
            individuals can heal, grow and thrive through life&apos;s challenges — reaching women
            across the UK, Ghana, the African diaspora and beyond.
          </p>
        </div>
      </div>

      <p style={{ margin: "34px 0 12px", fontWeight: 800, color: "var(--navy)", fontSize: 14, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        The values that guide us
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
        {values.map((v) => (
          <span className="chip" key={v}>
            <span className="chip-check">
              <Icon name="check" size={12} stroke="#fff" />
            </span>
            {v}
          </span>
        ))}
      </div>
    </Section>
  );
}

function IconBadge({ name }: { name: string }) {
  return (
    <span
      className="mv-icon"
      style={{
        width: 46,
        height: 46,
        borderRadius: 13,
        background: "var(--grad-teal)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        boxShadow: "0 8px 18px rgba(79,168,168,0.42)",
      }}
    >
      <Icon name={name} size={23} stroke="#fff" />
    </span>
  );
}
