import { Icon } from "./icons";
import { PillButton } from "./PillButton";
import { SitePhoto } from "./SitePhoto";
import { whatToExpect } from "@/data/site";
import { whatToExpectPhoto } from "@/data/photos";

/**
 * "What to expect in your sessions" (launch checklist, website content §2):
 * on Our Services below the services, linked from the homepage, with the
 * booking button the checklist asks for. The photo leads on phones.
 */
export function WhatToExpect() {
  const w = whatToExpect;
  return (
    <section id={w.id} className="card" style={{ padding: "30px 30px 32px", scrollMarginTop: 130 }}>
      <div className="svc-detail-grid">
        <div>
          <span className="eyebrow">{w.eyebrow}</span>
          <h2 style={{ margin: "12px 0 0", fontSize: 26, lineHeight: 1.2, color: "var(--navy)", fontWeight: 800 }}>{w.heading}</h2>
          <p style={{ margin: "12px 0 0", fontSize: 15.5, lineHeight: 1.6, color: "var(--ink)" }}>{w.intro}</p>
          <ul style={{ listStyle: "none", margin: "16px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {w.points.map((p) => (
              <li key={p.title} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 15, lineHeight: 1.55, color: "var(--ink)" }}>
                <span className="svc-icon" aria-hidden style={{ margin: 0, flex: "0 0 auto", width: 36, height: 36, borderRadius: 10 }}>
                  <Icon name={p.icon} size={19} stroke="#fff" />
                </span>
                <span>
                  <strong style={{ color: "var(--navy)" }}>{p.title}</strong> – {p.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <SitePhoto photo={whatToExpectPhoto} className="svc-detail-photo" sizes="(max-width: 900px) calc(100vw - 100px), 420px" />
      </div>
      <p style={{ margin: "20px 0 0", padding: "12px 16px", borderRadius: 10, background: "rgba(79,168,168,0.08)", border: "1px solid rgba(79,168,168,0.22)", fontSize: 14, lineHeight: 1.55, color: "var(--navy)" }}>
        {w.note}
      </p>
      <div className="cta-stack" style={{ marginTop: 22, display: "flex" }}>
        <PillButton variant="gold" size="lg" href={w.cta.href} icon="arrow">
          {w.cta.label}
        </PillButton>
      </div>
    </section>
  );
}
