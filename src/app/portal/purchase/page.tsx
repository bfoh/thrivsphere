import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getCurrentActor } from "@/lib/session";
import { getOnboardingState } from "@/lib/onboarding";
import { getDb } from "@/db";
import { pricePlans } from "@/db/schema";
import { PlanButton } from "@/components/portal/PlanButton";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Buy sessions", robots: { index: false, follow: false } };

const money = (pence: number, currency: string) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency, minimumFractionDigits: 0 }).format(pence / 100);

export default async function PurchasePage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  const state = await getOnboardingState(actor.userId);
  if (state.step !== "complete") redirect("/portal/register");

  const plans = await getDb()
    .select()
    .from(pricePlans)
    .where(eq(pricePlans.active, true))
    .orderBy(asc(pricePlans.sortOrder));

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 24px 72px" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: "clamp(24px,4.6vw,30px)", fontWeight: 800, color: "var(--navy)" }}>
        Buy sessions
      </h1>
      <p style={{ margin: "0 0 28px", fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
        Payment is handled securely by Stripe — your card details never reach ThrivSphere. Sessions
        appear in your account as soon as payment clears.
      </p>

      <div className="prog-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        {plans.map((p) => (
          <div key={p.id} className={`price-card${p.featured ? " featured" : ""}`}>
            {p.featured && (
              <span style={{ alignSelf: "flex-start", background: "var(--grad-gold)", color: "#3a2f06", fontSize: 11, fontWeight: 800, padding: "5px 12px", borderRadius: 50, marginBottom: 10 }}>
                MOST POPULAR
              </span>
            )}
            <h2 style={{ margin: "0 0 6px", fontSize: 17, color: "var(--navy)" }}>{p.name}</h2>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "6px 0 10px" }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: "var(--teal-deep)" }}>
                {money(p.amountPence, p.currency)}
              </span>
              <span style={{ fontSize: 13, color: "var(--navy-soft)" }}>
                {p.sessions > 1 ? `${p.sessions} sessions` : "1 session"}
              </span>
            </div>
            {p.blurb && <p style={{ margin: "0 0 14px", fontSize: 13.5, lineHeight: 1.5, color: "var(--ink)" }}>{p.blurb}</p>}
            {p.validityDays && (
              <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--navy-soft)", display: "flex", gap: 6, alignItems: "center" }}>
                <Icon name="check" size={14} stroke="var(--teal)" /> Valid for {Math.round(p.validityDays / 30)} months
              </p>
            )}
            <PlanButton planSlug={p.slug} cta="Buy" featured={p.featured} />
          </div>
        ))}
      </div>
    </div>
  );
}
