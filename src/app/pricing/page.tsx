import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { Icon } from "@/components/icons";
import { plans, faqs } from "@/data/site";
import { NotCrisisNotice } from "@/components/NotCrisisNotice";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Clear, affordable pricing for ThrivSphere wellbeing support, coaching and our resilience programme.",
};

export default function PricingPage() {
  return (
    <PageShell
      eyebrow="Pricing"
      watermark="Pricing"
      title="Affordable, transparent wellbeing support"
      intro="As a Community Interest Company, we keep pricing fair and accessible. Every service is open to adults aged 18+ — women and men. Concessions are available: if cost is a barrier, please get in touch and we'll do our best to help."
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }} className="prog-grid">
        {plans.map((p) => (
          <div key={p.name} className={`price-card${p.featured ? " featured" : ""}`}>
            {p.featured && (
              <span
                style={{
                  alignSelf: "flex-start",
                  background: "var(--grad-gold)",
                  color: "#3a2f06",
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "5px 12px",
                  borderRadius: 50,
                  letterSpacing: "0.05em",
                  marginBottom: 12,
                  boxShadow: "0 6px 14px rgba(212,175,55,0.4)",
                }}
              >
                MOST POPULAR
              </span>
            )}
            <h3 style={{ margin: "0 0 6px", fontSize: 19, color: "var(--navy)" }}>{p.name}</h3>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "10px 0" }}>
              <span style={{ fontSize: 34, fontWeight: 800, color: "var(--teal-deep)" }}>{p.price}</span>
              <span style={{ fontSize: 13.5, color: "var(--navy-soft)" }}>{p.unit}</span>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.5, color: "var(--ink)" }}>{p.blurb}</p>
            <ul style={{ listStyle: "none", margin: "0 0 22px", padding: 0, display: "flex", flexDirection: "column", gap: 9 }}>
              {p.features.map((f) => (
                <li key={f} style={{ display: "flex", gap: 8, fontSize: 14, color: "var(--ink)" }}>
                  <Icon name="check" size={17} stroke="var(--teal)" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/book"
              className={`pill ${p.featured ? "pill-gold" : "pill-teal"}`}
              // marginTop:auto pins every CTA to the foot of its card so the
              // row of buttons lines up even though the cards differ in height.
              style={{
                width: "100%",
                marginTop: "auto",
                padding: "13px 16px",
                fontSize: 13.5,
                textAlign: "center",
              }}
            >
              {p.cta} <Icon name="arrow" size={16} />
            </Link>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 22, fontSize: 13.5, color: "var(--navy-soft)", textAlign: "center" }}>
        Sessions are paid in advance. Concessionary and grant-funded places may be available — if
        cost is a barrier, please{" "}
        <Link href="/contact" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
          talk to us
        </Link>{" "}
        before deciding not to come. See our{" "}
        <Link href="/payments" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
          Payments, Cancellations, Refunds &amp; No-Shows policy
        </Link>
        .
      </p>

      <NotCrisisNotice style={{ marginTop: 34 }} />

      <p style={{ margin: "22px 0 0", fontSize: 14.5, color: "var(--navy-soft)", textAlign: "center" }}>
        Already a client?{" "}
        <Link href="/sign-in" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
          Sign in
        </Link>{" "}
        to buy sessions from your account.
      </p>

      <h2 style={{ margin: "56px 0 20px", fontSize: 28, color: "var(--navy)", fontWeight: 800 }}>
        Frequently asked questions
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {faqs.map((f) => (
          <details key={f.q} className="card" style={{ padding: "16px 22px" }}>
            <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--navy)", fontSize: 15.5, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              {f.q}
              <Icon name="chevron-down" size={20} stroke="var(--teal)" />
            </summary>
            <p style={{ margin: "12px 0 0", fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)" }}>{f.a}</p>
          </details>
        ))}
      </div>
    </PageShell>
  );
}
