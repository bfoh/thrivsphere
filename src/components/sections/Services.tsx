"use client";

import { Section } from "../Section";
import { Icon } from "../icons";
import { FancyHeadline } from "../FancyHeadline";
import { services, educationTopics } from "@/data/site";

const CREAM = "#efd98a";

export function Services() {
  return (
    <Section id="services" aura="teal" background="linear-gradient(160deg,#4fa8a8 0%,#3d8a8a 100%)" watermark="Services">
      <FancyHeadline
        lines={[
          [
            { t: "learn", size: 13, weight: 700, color: CREAM },
            { t: "MORE", size: 19, weight: 900, italic: true, color: "#fff" },
            { t: "about the", size: 13, weight: 700, color: CREAM },
          ],
          [{ t: "SERVICES", size: 54, weight: 900, color: "#fff" }],
          [
            { t: "we", size: 13, weight: 700, color: CREAM },
            { t: "offer", size: 19, weight: 900, color: CREAM },
          ],
        ]}
      />
      <p style={{ margin: "14px 0 0", fontSize: 16.5, lineHeight: 1.6, maxWidth: 720, color: "#e9f4f4" }}>
        Flexible, confidential and accessible online — choose the support that fits your life.
      </p>

      <div className="services-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginTop: 34 }}>
        {services.map((s) => (
          <div key={s.title} className="svc-card">
            <span className="svc-icon">
              <Icon name={s.icon} size={25} stroke="#fff" />
            </span>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, lineHeight: 1.25, color: "var(--navy)", fontWeight: 700 }}>
              {s.title}
            </h3>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "var(--ink)" }}>{s.desc}</p>
            <span className="svc-arrow">
              Learn more <Icon name="arrow" size={15} stroke="var(--teal-deep)" />
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 30, display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 340px" }} className="hide-mobile">
          <p style={{ margin: "0 0 10px", color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Wellbeing education topics
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {educationTopics.map((t) => (
              <span
                key={t}
                style={{
                  padding: "7px 14px",
                  borderRadius: 50,
                  background: "rgba(255,255,255,0.16)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <div
          style={{
            flex: "1 1 300px",
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 14,
            padding: "18px 20px",
            color: "#eef6f6",
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          <strong style={{ color: "#fff" }}>Signposting &amp; safety.</strong> Where extra help is
          needed, we refer to trusted domestic abuse, crisis, housing and mental health services.
          ThrivSphere does not provide legal advice, crisis or emergency services.
        </div>
      </div>
    </Section>
  );
}
