import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { ScopeOfPractice } from "@/components/ScopeOfPractice";
import { Icon } from "@/components/icons";
import { services, educationTopics, audience } from "@/data/site";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Our Services",
  description:
    "Confidential online wellbeing support, coaching, mindfulness, education, peer support and signposting for adults aged 18+ — women and men.",
};

export default function ServicesPage() {
  return (
    <PageShell
      eyebrow="Our Services"
      watermark="Services"
      title="Support that fits around your life"
      intro="Flexible, confidential and accessible online. Every service is open to adults aged 18 and over — women and men."
    >
      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 18 }}>
        {services.map((s) => (
          <div key={s.title} className="svc-card">
            <span className="svc-icon">
              <Icon name={s.icon} size={25} stroke="#fff" />
            </span>
            <h2 style={{ margin: "0 0 8px", fontSize: 17, lineHeight: 1.25, color: "var(--navy)", fontWeight: 700 }}>
              {s.title}
            </h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--ink)" }}>{s.desc}</p>
          </div>
        ))}
      </div>

      {/* who we support */}
      <h2 style={{ margin: "48px 0 6px", fontSize: 26, fontWeight: 800, color: "var(--navy)" }}>
        What people come to us with
      </h2>
      <p style={{ margin: "0 0 18px", fontSize: 15.5, lineHeight: 1.6, color: "var(--ink)", maxWidth: 700 }}>
        You don&apos;t need a diagnosis or a label to get support. If something is weighing on you,
        that is reason enough.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
        {audience.map((a) => (
          <span className="chip chip-dot" key={a}>
            {a}
          </span>
        ))}
      </div>

      {/* education topics */}
      <h2 style={{ margin: "48px 0 16px", fontSize: 26, fontWeight: 800, color: "var(--navy)" }}>
        Wellbeing education topics
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
        {educationTopics.map((t) => (
          <span className="chip" key={t}>
            <span className="chip-check">
              <Icon name="check" size={12} stroke="#fff" />
            </span>
            {t}
          </span>
        ))}
      </div>

      <div style={{ marginTop: 48 }}>
        <ScopeOfPractice />
      </div>

      <div
        style={{
          marginTop: 40,
          textAlign: "center",
          background: "linear-gradient(135deg,#f2f6ee,#e6efe1)",
          borderRadius: 18,
          padding: "34px 24px",
        }}
      >
        <h2 style={{ margin: "0 0 8px", fontSize: 22, color: "var(--navy)" }}>
          Not sure which is right for you?
        </h2>
        <p style={{ margin: "0 auto 18px", maxWidth: 520, fontSize: 15, lineHeight: 1.55, color: "var(--ink)" }}>
          Start with a £20 initial consultation. We&apos;ll talk it through together — and if
          we&apos;re not the right fit, we&apos;ll help you find who is.
        </p>
        <Link href="/book" className="pill pill-gold" style={{ padding: "13px 26px", fontSize: 14.5 }}>
          Book a Consultation <Icon name="arrow" size={16} />
        </Link>
      </div>
    </PageShell>
  );
}
