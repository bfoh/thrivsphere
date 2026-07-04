import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { Icon } from "@/components/icons";
import { resources } from "@/data/site";

export const metadata: Metadata = {
  title: "Resource Centre — ThrivSphere Wellbeing CIC",
  description: "A digital wellbeing library of guides, exercises, articles and self-help resources to support your journey.",
};

export default function ResourcesPage() {
  return (
    <PageShell
      eyebrow="Resource Centre"
      watermark="Resources"
      title="Free wellbeing resources, whenever you need them"
      intro="A growing library of trusted guides, exercises and articles to support your wellbeing between sessions — free to explore."
      aura="teal"
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 20 }} className="two-col">
        {resources.map((r) => (
          <a key={r.slug} href={`/resources/${r.slug}`} className="tile" style={{ padding: 26, display: "flex", gap: 16 }}>
            <span className="tile-icon">
              <Icon name={r.icon} size={24} stroke="#fff" />
            </span>
            <div>
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gold)" }}>
                {r.category}
              </span>
              <h3 style={{ margin: "4px 0 6px", fontSize: 17, color: "var(--navy)", lineHeight: 1.25 }}>{r.title}</h3>
              <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.5, color: "var(--ink)" }}>{r.desc}</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 12.5, color: "var(--navy-soft)" }}>{r.type}</span>
                <span className="tile-arrow">
                  Read resource <Icon name="arrow" size={15} stroke="var(--teal-deep)" />
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div style={{ marginTop: 34, textAlign: "center", background: "linear-gradient(135deg,#f2f6ee,#e6efe1)", borderRadius: 18, padding: "34px 24px" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 21, color: "var(--navy)" }}>New resources every month</h3>
        <p style={{ margin: "0 auto 18px", maxWidth: 480, fontSize: 15, lineHeight: 1.55, color: "var(--ink)" }}>
          Join our free wellbeing newsletter and be first to receive new guides, exercises and webinar invitations.
        </p>
        <a href="/#support" className="pill pill-gold" style={{ padding: "13px 26px", fontSize: 14.5 }}>
          Join the newsletter <Icon name="arrow" size={16} />
        </a>
      </div>
    </PageShell>
  );
}
