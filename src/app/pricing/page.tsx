import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { Icon } from "@/components/icons";
import { brand, plans as planCopy } from "@/data/site";
import { displayPrice } from "@/lib/money";
import { toPricingCard } from "@/lib/pricing";
import { getActivePlans } from "@/lib/queries/catalogue";
import { NotCrisisNotice } from "@/components/NotCrisisNotice";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing and Packages",
  description:
    "ThriveSphere Wellbeing prices: Initial Wellbeing Needs Review, individual 50-minute wellbeing support sessions, and optional four- and six-session packages.",
};

// Prices live in the database. The page is rebuilt at most every five minutes,
// so a price change shows here without a redeploy.
export const revalidate = 300;

/** Packages are bought from the client's account; single appointments are booked. */
const ctaHref = (sessions: number) => (sessions > 1 ? "/portal/purchase" : "/book");

export default async function PricingPage() {
  const copy = new Map(planCopy.map((p) => [p.slug, p]));
  const plans = (await getActivePlans()).map((row) => toPricingCard(row, copy.get(row.slug)));

  return (
    <PageShell
      eyebrow="Pricing and Packages"
      watermark="Pricing"
      title="Clear, simple pricing"
      intro="Every session is 50 minutes, online. The Initial Wellbeing Needs Review is charged separately from the packages. Packages are optional — you can continue with individual appointments without purchasing one."
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }} className="prog-grid">
        {plans.map((p) => (
          <div key={p.slug} className={`price-card${p.featured ? " featured" : ""}`}>
            <h3 style={{ margin: "0 0 6px", fontSize: 19, color: "var(--navy)" }}>{p.name}</h3>
            <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 6, margin: "10px 0" }}>
              <span style={{ fontSize: 34, fontWeight: 800, color: "var(--teal-deep)" }}>{displayPrice(p.amountPence)}</span>
              <span style={{ fontSize: 13.5, color: "var(--navy-soft)" }}>{p.unit}</span>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.5, color: "var(--ink)" }}>{p.blurb}</p>
            <ul style={{ listStyle: "none", margin: "0 0 22px", padding: 0, display: "flex", flexDirection: "column", gap: 9 }}>
              {p.features.map((f) => (
                <li key={f} style={{ display: "flex", gap: 8, fontSize: 14, color: "var(--ink)" }}>
                  <span style={{ flex: "0 0 auto" }}>
                    <Icon name="check" size={17} stroke="var(--teal)" />
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href={ctaHref(p.sessions)}
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

      <p style={{ marginTop: 22, fontSize: 14, color: "var(--navy-soft)", textAlign: "center", lineHeight: 1.6 }}>
        {brand.availabilityLine} Support is not limited to a fixed number of sessions — see{" "}
        <Link href="/how-it-works" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
          How It Works
        </Link>
        . Payments, cancellations and refunds are covered by our{" "}
        <Link href="/payments" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
          Cancellation and Refund Policy
        </Link>
        .
      </p>

      <NotCrisisNotice style={{ marginTop: 34 }} />

      <p style={{ margin: "22px 0 0", fontSize: 14.5, color: "var(--navy-soft)", textAlign: "center" }}>
        Already a client?{" "}
        <Link href="/sign-in" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
          Sign in
        </Link>{" "}
        to book or buy sessions from your account. Questions? Read our{" "}
        <Link href="/faq" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
          FAQ
        </Link>
        .
      </p>
    </PageShell>
  );
}
