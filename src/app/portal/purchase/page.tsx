import type { Metadata } from "next";
import Link from "next/link";
import { requirePortalClient } from "@/lib/portal-guard";
import { getActivePlans } from "@/lib/queries/catalogue";
import { REVIEW_PLAN_SLUG } from "@/lib/allocation";
import { getSessionGate } from "@/lib/booking-engine";
import { PlanButton } from "@/components/portal/PlanButton";
import { Icon } from "@/components/icons";
import { getOffer } from "@/lib/queries/discounts";
import { normaliseCode } from "@/lib/discounts";

export const metadata: Metadata = { title: "Buy sessions", robots: { index: false, follow: false } };

const money = (pence: number, currency: string) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency, minimumFractionDigits: 0 }).format(pence / 100);

export default async function PurchasePage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { clientId } = await requirePortalClient();
  const code = normaliseCode((await searchParams).code ?? "").slice(0, 24);

  // The initial consultation is paid for as it is booked (IT handover §19),
  // so it is not sold on its own here; everything else pays for ongoing
  // sessions, which open only after the practitioner records Suitable.
  const [all, gate] = await Promise.all([getActivePlans(), getSessionGate(clientId)]);
  const plans = gate.open ? all.filter((p) => p.slug !== REVIEW_PLAN_SLUG) : [];

  // Each client's own price: with their concession, or a code they entered,
  // whichever is lower. Checked again, from scratch, when they press Buy.
  const offers = await Promise.all(
    plans.map((p) => getOffer({ clientId, planSlug: p.slug, listPence: p.amountPence, code: code || null }))
  );
  const codeWorks = offers.some((o) => !o.codeError && o.discount?.kind === "code");
  const codeMessage = !code
    ? null
    : codeWorks
      ? { ok: true, text: `Code ${code} applied. The prices below include it.` }
      : offers.find((o) => o.codeNote)
        ? { ok: true, text: offers.find((o) => o.codeNote)!.codeNote! }
        : { ok: false, text: offers[0]?.codeError ?? "That code isn't recognised. Please check it and try again." };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 24px 72px" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: "clamp(24px,4.6vw,30px)", fontWeight: 800, color: "var(--navy)" }}>
        Buy sessions
      </h1>
      <p style={{ margin: "0 0 28px", fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
        Payment is handled securely by Stripe — your card details never reach ThriveSphere. Sessions
        appear in your account as soon as payment clears.
      </p>

      {!gate.open && (
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 19, color: "var(--navy)" }}>Next steps</h2>
          <p style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>{gate.message}</p>
          <Link href="/portal/messages" className="pill pill-teal" style={{ padding: "12px 24px", fontSize: 14.5 }}>
            Message us
          </Link>
        </div>
      )}

      {plans.length > 0 && (
        <form method="get" style={{ margin: "0 0 22px", display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "0 1 260px" }}>
            <label htmlFor="code" style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700, color: "var(--navy)" }}>
              Have a discount code?
            </label>
            <input
              id="code"
              name="code"
              defaultValue={code}
              maxLength={24}
              autoCapitalize="characters"
              autoComplete="off"
              style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 14.5, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(31,58,95,0.2)", textTransform: "uppercase" }}
            />
          </div>
          <button className="pill pill-ghost" style={{ padding: "10px 20px", fontSize: 13.5 }}>
            Apply
          </button>
          {codeMessage && (
            <p role={codeMessage.ok ? "status" : "alert"} style={{ flexBasis: "100%", margin: 0, fontSize: 13, fontWeight: 600, color: codeMessage.ok ? "var(--teal-deep)" : "#a1421c" }}>
              {codeMessage.text}
            </p>
          )}
        </form>
      )}

      <div className="prog-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(plans.length, 1)},1fr)`, gap: 16 }}>
        {plans.map((p, i) => (
          <div key={p.id} className={`price-card${p.featured ? " featured" : ""}`}>
            <h2 style={{ margin: "0 0 6px", fontSize: 17, color: "var(--navy)" }}>{p.name}</h2>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "6px 0 10px", flexWrap: "wrap" }}>
              {offers[i].discount && (
                <s style={{ fontSize: 17, fontWeight: 600, color: "var(--navy-soft)" }}>{money(p.amountPence, p.currency)}</s>
              )}
              <span style={{ fontSize: 30, fontWeight: 800, color: "var(--teal-deep)" }}>
                {money(offers[i].pricePence, p.currency)}
              </span>
              <span style={{ fontSize: 13, color: "var(--navy-soft)" }}>
                {p.sessions > 1 ? `${p.sessions} sessions` : "1 session"}
              </span>
            </div>
            {offers[i].discount && (
              <p style={{ margin: "0 0 10px", fontSize: 12.5, fontWeight: 700, color: "var(--teal-deep)" }}>{offers[i].discount!.label}</p>
            )}
            {p.blurb && <p style={{ margin: "0 0 14px", fontSize: 13.5, lineHeight: 1.5, color: "var(--ink)" }}>{p.blurb}</p>}
            {p.validityDays && (
              <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--navy-soft)", display: "flex", gap: 6, alignItems: "center" }}>
                <Icon name="check" size={14} stroke="var(--teal)" /> Valid for {Math.round(p.validityDays / 30)} months
              </p>
            )}
            <PlanButton
              planSlug={p.slug}
              cta={offers[i].pricePence === 0 ? "Add to my account" : "Buy"}
              featured={p.featured}
              code={offers[i].discount?.kind === "code" ? code : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
