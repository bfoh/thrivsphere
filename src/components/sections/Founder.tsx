"use client";

import { Section } from "../Section";
import { Icon } from "../icons";
import { FancyHeadline } from "../FancyHeadline";
import { founder } from "@/data/site";

const GOLD = "#bd951f";
const TEAL = "#3d8a8a";
const NAVY = "#1f3a5f";

export function Founder() {
  return (
    <Section id="founder" aura="warm" watermark="Founder">
      <div className="founder-grid" style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 48, alignItems: "center", marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div className="founder-card" style={{ width: 330, maxWidth: "82vw" }}>
            <div className="founder-avatar">PB</div>
            <h3 style={{ margin: 0, fontSize: 22, color: "var(--navy)" }}>{founder.name}</h3>
            {founder.titles.map((t) => (
              <p key={t} style={{ margin: "6px 0 0", fontSize: 13.5, color: "var(--teal-deep)", fontWeight: 600 }}>
                {t}
              </p>
            ))}
            <div
              style={{
                marginTop: 18,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.03em",
                color: "#8a6d12",
                background: "rgba(212,175,55,0.14)",
                padding: "7px 14px",
                borderRadius: 50,
              }}
            >
              <Icon name="shield" size={15} stroke="#b8922a" /> Clinically-led care
            </div>
          </div>
        </div>

        <div>
          <FancyHeadline
            lines={[
              [{ t: "meet the", size: 16, italic: true, color: GOLD }],
              [{ t: "FOUNDER", size: 52, weight: 800, color: NAVY }],
              [
                { t: "compassionate,", size: 18, italic: true, color: TEAL },
                { t: "CLINICALLY-LED", size: 24, weight: 800, color: NAVY },
              ],
            ]}
          />
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            {founder.bio.map((p, i) => (
              <p key={i} style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: "var(--ink)" }}>
                {p}
              </p>
            ))}
          </div>
          <blockquote
            style={{
              margin: "26px 0 0",
              padding: "16px 22px",
              borderLeft: "4px solid var(--gold)",
              background: "rgba(212,175,55,0.08)",
              borderRadius: "0 12px 12px 0",
              fontSize: 16.5,
              fontStyle: "italic",
              color: "var(--navy)",
            }}
          >
            &ldquo;Every woman deserves a place to heal, grow and thrive.&rdquo;
          </blockquote>
        </div>
      </div>
    </Section>
  );
}
