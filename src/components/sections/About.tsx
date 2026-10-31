"use client";

import { Section } from "../Section";
import { Icon } from "../icons";
import { FancyHeadline } from "../FancyHeadline";
import { homeIntro, mission, values } from "@/data/site";

const GOLD = "#bd951f";
const TEAL = "#3d8a8a";
const NAVY = "#1f3a5f";

export function About() {
  return (
    <Section id="about" aura="sage" background="linear-gradient(160deg,#f2f6ee 0%,#e6efe1 100%)" watermark="About">
      <FancyHeadline
        lines={[
          [{ t: "who we are —", size: 17, italic: true, color: GOLD }],
          [{ t: "PROFESSIONAL,", size: 46, weight: 800, color: NAVY }],
          [
            { t: "compassionate", size: 23, italic: true, color: TEAL },
            { t: "SUPPORT", size: 42, weight: 800, color: NAVY },
          ],
        ]}
      />
      {homeIntro.paragraphs.slice(1).map((p, i) => (
        <p key={i} style={{ margin: i === 0 ? "16px 0 0" : "12px 0 0", fontSize: 16.5, lineHeight: 1.6, maxWidth: 780, color: "var(--ink)" }}>
          {p}
        </p>
      ))}

      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 30 }}>
        <div className="mv-card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <IconBadge name="lotus" />
            <h3 style={{ margin: 0, fontSize: 21, color: "var(--navy)" }}>Our Mission</h3>
          </div>
          <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: "var(--ink)" }}>{mission}</p>
        </div>
        <div className="mv-card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <IconBadge name="heart" />
            <h3 style={{ margin: 0, fontSize: 21, color: "var(--navy)" }}>Our Values</h3>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {values.map((v) => (
              <span className="chip" key={v}>
                <span className="chip-check">
                  <Icon name="check" size={12} stroke="#fff" />
                </span>
                {v}
              </span>
            ))}
          </div>
        </div>
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
