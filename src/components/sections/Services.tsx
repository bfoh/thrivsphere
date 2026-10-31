"use client";

import Link from "next/link";
import { Section } from "../Section";
import { Icon } from "../icons";
import { FancyHeadline } from "../FancyHeadline";
import { brand, type Service } from "@/data/site";

const CREAM = "#efd98a";

export function Services({ services }: { services: Service[] }) {
  return (
    <Section id="services" aura="teal" background="linear-gradient(160deg,#4fa8a8 0%,#3d8a8a 100%)" watermark="Services">
      <FancyHeadline
        lines={[
          [
            { t: "learn", size: 13, weight: 700, color: CREAM },
            { t: "MORE", size: 19, weight: 900, italic: true, color: "#fff" },
            { t: "about", size: 13, weight: 700, color: CREAM },
          ],
          [{ t: "OUR SERVICES", size: 54, weight: 900, color: "#fff" }],
        ]}
      />
      <p style={{ margin: "14px 0 0", fontSize: 16.5, lineHeight: 1.6, maxWidth: 720, color: "#e9f4f4" }}>
        {brand.positioning}
      </p>

      <div className="services-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 16, marginTop: 34 }}>
        {services.map((s) => (
          <Link key={s.slug} href={`/services#${s.slug}`} className="svc-card" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="svc-icon">
              <Icon name={s.icon} size={25} stroke="#fff" />
            </span>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, lineHeight: 1.25, color: "var(--navy)", fontWeight: 700 }}>
              {s.title}
            </h3>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "var(--ink)" }}>{s.summary}</p>
            <span className="svc-arrow">
              Learn more <Icon name="arrow" size={15} stroke="var(--teal-deep)" />
            </span>
          </Link>
        ))}
      </div>

      <div
        style={{
          marginTop: 30,
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 14,
          padding: "18px 20px",
          color: "#eef6f6",
          fontSize: 14,
          lineHeight: 1.55,
          maxWidth: 820,
        }}
      >
        <strong style={{ color: "#fff" }}>ThriveSphere is not an emergency service.</strong> We
        provide non-clinical wellbeing support, psychoeducation and practical coping skills
        development. Clients requiring urgent or emergency support should contact appropriate local
        emergency or healthcare services.
      </div>
    </Section>
  );
}
