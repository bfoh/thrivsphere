import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { ScopeOfPractice } from "@/components/ScopeOfPractice";
import { Icon } from "@/components/icons";
import { founder, values, programme, impact } from "@/data/site";

export const metadata: Metadata = {
  title: "About ThrivSphere",
  description:
    "ThrivSphere Wellbeing CIC is a UK Community Interest Company providing non-clinical wellbeing support, education and signposting to adults aged 18+ — women and men.",
};

export default function AboutPage() {
  return (
    <PageShell
      eyebrow="About ThrivSphere"
      watermark="About"
      title="A trusted, accessible wellbeing community"
      intro="ThrivSphere Wellbeing CIC is a UK-based Community Interest Company with an international vision. We exist to improve the emotional, mental and social wellbeing of adults aged 18 and over — women and men."
      aura="sage"
    >
      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        <div className="mv-card">
          <h2 style={{ margin: "0 0 10px", fontSize: 21, color: "var(--navy)" }}>Our Mission</h2>
          <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: "var(--ink)" }}>
            To promote emotional, mental and social wellbeing through accessible education,
            emotional support, coaching, mindfulness, peer support, community connection and
            signposting — helping adults build resilience, support recovery, improve confidence and
            create positive futures.
          </p>
        </div>
        <div className="mv-card">
          <h2 style={{ margin: "0 0 10px", fontSize: 21, color: "var(--navy)" }}>Our Vision</h2>
          <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: "var(--ink)" }}>
            To create a trusted, accessible and empowering online wellbeing community where
            individuals can heal, grow and thrive through life&apos;s challenges — reaching adults
            across the UK, Ghana, the African diaspora and beyond.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 40 }}>
        <ScopeOfPractice />
      </div>

      {/* founder */}
      <h2 style={{ margin: "48px 0 6px", fontSize: 26, fontWeight: 800, color: "var(--navy)" }}>
        Who runs ThrivSphere
      </h2>
      <p style={{ margin: "0 0 22px", fontSize: 15.5, lineHeight: 1.6, color: "var(--ink)", maxWidth: 680 }}>
        ThrivSphere is founded and delivered by experienced professionals with backgrounds in mental
        health and wellbeing.
      </p>
      <div
        className="founder-grid"
        style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 36, alignItems: "start" }}
      >
        <div className="founder-card">
          <div className="founder-avatar">PB</div>
          <h3 style={{ margin: 0, fontSize: 21, color: "var(--navy)" }}>{founder.name}</h3>
          {founder.titles.map((t) => (
            <p key={t} style={{ margin: "6px 0 0", fontSize: 13.5, color: "var(--teal-deep)", fontWeight: 600 }}>
              {t}
            </p>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {founder.bio.map((p, i) => (
            <p key={i} style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: "var(--ink)" }}>
              {p}
            </p>
          ))}
        </div>
      </div>

      {/* values */}
      <h2 style={{ margin: "48px 0 16px", fontSize: 26, fontWeight: 800, color: "var(--navy)" }}>
        The values that guide us
      </h2>
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

      {/* programme */}
      <h2 style={{ margin: "48px 0 6px", fontSize: 26, fontWeight: 800, color: "var(--navy)" }}>
        Our flagship programme
      </h2>
      <p style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "var(--teal-deep)" }}>
        {programme.name}
      </p>
      <p style={{ margin: "0 0 22px", fontSize: 16, lineHeight: 1.6, color: "var(--ink)", maxWidth: 760 }}>
        {programme.aim}
      </p>
      <div className="prog-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
        <Column title="Objectives" items={programme.objectives} accent="var(--teal)" />
        <Column title="Activities" items={programme.activities} accent="var(--gold)" />
        <Column title="Expected outcomes" items={programme.outcomes} accent="#c77fa0" />
      </div>

      <div className="impact-row" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginTop: 40 }}>
        {impact.map((i) => (
          <div
            key={i.label}
            style={{
              textAlign: "center",
              padding: "18px 12px",
              background: "#fff",
              borderRadius: 14,
              border: "1px solid rgba(31,58,95,0.08)",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--teal-deep)" }}>{i.stat}</div>
            <div style={{ fontSize: 12.5, color: "var(--navy-soft)", marginTop: 4 }}>{i.label}</div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

function Column({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ margin: "0 0 14px", fontSize: 17, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: accent, display: "inline-block" }} />
        {title}
      </h3>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((it) => (
          <li key={it} style={{ display: "flex", gap: 9, fontSize: 14.5, lineHeight: 1.45, color: "var(--ink)" }}>
            <span style={{ flex: "0 0 auto", marginTop: 1 }}>
              <Icon name="check" size={17} stroke={accent} />
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
