import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { ScopeOfPractice } from "@/components/ScopeOfPractice";
import { TeamCard } from "@/components/TeamCard";
import { Icon } from "@/components/icons";
import { homeIntro, impact, legal, mission, team, values } from "@/data/site";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "ThriveSphere Wellbeing provides professional, compassionate and personalised online wellbeing support, delivered by experienced Registered Mental Health Nurses.",
};

export default function AboutPage() {
  return (
    <PageShell
      eyebrow="About Us"
      watermark="About"
      title="Supporting your wellbeing, strengthening your resilience"
      intro={homeIntro.paragraphs[0]}
      aura="sage"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 780 }}>
        {homeIntro.paragraphs.slice(1).map((p, i) => (
          <p key={i} style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: "var(--ink)" }}>
            {p}
          </p>
        ))}
      </div>

      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 34 }}>
        <div className="mv-card">
          <h2 style={{ margin: "0 0 10px", fontSize: 21, color: "var(--navy)" }}>Our Mission</h2>
          <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: "var(--ink)" }}>{mission}</p>
        </div>
        <div className="mv-card">
          <h2 style={{ margin: "0 0 12px", fontSize: 21, color: "var(--navy)" }}>Our Values</h2>
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

      {/* professional experience */}
      <h2 style={{ margin: "48px 0 6px", fontSize: 26, fontWeight: 800, color: "var(--navy)" }}>
        Our professional team
      </h2>
      <p style={{ margin: "0 0 22px", fontSize: 15.5, lineHeight: 1.6, color: "var(--ink)", maxWidth: 680 }}>
        Our practitioners are experienced Registered Mental Health Nurses with professional
        backgrounds in face-to-face and remote mental health support.
      </p>
      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, alignItems: "stretch" }}>
        {team.map((m) => (
          <TeamCard key={m.slug} member={m} />
        ))}
      </div>
      <p style={{ margin: "18px 0 0", fontSize: 14.5 }}>
        <Link href="/team" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
          Meet Our Team
        </Link>{" "}
        ·{" "}
        <Link href="/how-it-works" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
          How It Works
        </Link>{" "}
        ·{" "}
        <Link href="/faq" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
          FAQ
        </Link>
      </p>

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

      <div style={{ marginTop: 48 }}>
        <ScopeOfPractice />
      </div>

      <p style={{ margin: "36px 0 0", fontSize: 13.5, lineHeight: 1.6, color: "var(--navy-soft)" }}>
        {legal.statement} Registered office: {legal.registeredOffice}.
      </p>
    </PageShell>
  );
}
