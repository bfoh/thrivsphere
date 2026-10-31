import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { pricePlans } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { displayPrice } from "@/lib/money";
import { Section, Empty } from "@/components/admin/RecordUI";
import { PlanForm } from "@/components/admin/PlanForm";

export const metadata: Metadata = { title: "Prices", robots: { index: false, follow: false } };

export default async function CataloguePage() {
  await requireCapability("catalogue:manage", {
    entity: "price_plans",
    action: "view",
    detail: "viewed prices",
  });

  const plans = await getDb().select().from(pricePlans).orderBy(asc(pricePlans.sortOrder), asc(pricePlans.name));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 24px 72px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "var(--navy)" }}>Prices</h1>
        <Link href="/pricing" style={{ fontSize: 14, fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none" }}>
          View pricing page →
        </Link>
      </div>
      <p style={{ margin: "0 0 24px", fontSize: 14, lineHeight: 1.6, color: "var(--navy-soft)" }}>
        One price list for the pricing page, the client&apos;s Buy sessions page and card payments. A change applies
        to new purchases straight away; payments already made are not affected. Every change is recorded in Activity.
      </p>

      {plans.length === 0 ? (
        <Empty>No price plans yet.</Empty>
      ) : (
        plans.map((p) => (
          <Section
            key={p.id}
            title={p.name}
            subtitle={`${displayPrice(p.amountPence)} · ${p.sessions} session${p.sessions === 1 ? "" : "s"} · ${p.active ? "on sale" : "not on sale"}`}
          >
            <PlanForm
              plan={{
                id: p.id,
                slug: p.slug,
                name: p.name,
                blurb: p.blurb,
                price: (p.amountPence / 100).toFixed(p.amountPence % 100 ? 2 : 0),
                sessions: p.sessions,
                sortOrder: p.sortOrder,
                active: p.active,
                featured: p.featured,
              }}
            />
          </Section>
        ))
      )}
    </div>
  );
}
