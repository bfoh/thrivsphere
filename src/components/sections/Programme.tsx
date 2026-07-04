"use client";

import { Section } from "../Section";
import { Icon } from "../icons";
import { PillButton } from "../PillButton";
import { FancyHeadline } from "../FancyHeadline";
import { programme } from "@/data/site";

const GOLD = "#bd951f";
const NAVY = "#1f3a5f";

function Column({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  return (
    <div className="card" style={{ padding: 26 }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 18, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: accent, display: "inline-block" }} />
        {title}
      </h3>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((it) => (
          <li key={it} style={{ display: "flex", gap: 9, fontSize: 14.5, lineHeight: 1.45, color: "var(--ink)" }}>
            <Icon name="check" size={17} stroke={accent} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Programme({ onNavigate }: { onNavigate: (id: string) => void }) {
  return (
    <Section id="programme" aura="sage" background="linear-gradient(160deg,#f2f6ee 0%,#e6efe1 100%)" watermark="Programme">
      <FancyHeadline
        lines={[
          [{ t: "our flagship", size: 16, italic: true, color: GOLD }],
          [{ t: "PROGRAMME", size: 48, weight: 800, color: NAVY }],
        ]}
      />
      <p style={{ margin: "12px 0 0", fontSize: 19, fontWeight: 700, color: "var(--teal-deep)", maxWidth: 780 }}>
        {programme.name}
      </p>
      <p style={{ margin: "12px 0 0", fontSize: 17, lineHeight: 1.6, maxWidth: 780, color: "var(--ink)" }}>
        {programme.aim}
      </p>

      <div className="prog-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginTop: 32 }}>
        <Column title="Objectives" items={programme.objectives} accent="var(--teal)" />
        <Column title="Activities" items={programme.activities} accent="var(--gold)" />
        <Column title="Expected outcomes" items={programme.outcomes} accent="#c77fa0" />
      </div>

      <div className="cta-stack" style={{ marginTop: 30, display: "flex" }}>
        <PillButton variant="teal" size="lg" onClick={() => onNavigate("support")} icon="arrow">
          Join the programme
        </PillButton>
      </div>
    </Section>
  );
}
