import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { pricePlans, services } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { displayPrice } from "@/lib/money";
import { Section, Empty } from "@/components/admin/RecordUI";
import { PlanForm, ServiceForm } from "@/components/admin/CatalogueForms";

export const metadata: Metadata = { title: "Services & prices", robots: { index: false, follow: false } };

const h2: React.CSSProperties = { margin: "34px 0 6px", fontSize: 21, fontWeight: 800, color: "var(--navy)" };
const lead: React.CSSProperties = { margin: "0 0 18px", fontSize: 14, lineHeight: 1.6, color: "var(--navy-soft)" };

function serviceSection(s: typeof services.$inferSelect) {
  return (
    <Section key={s.id} title={s.name} subtitle={s.active ? "Shown on the website" : "Hidden"}>
      <ServiceForm
        service={{
          id: s.id,
          slug: s.slug,
          name: s.name,
          summary: s.summary,
          description: s.description,
          points: s.points,
          note: s.note,
          sortOrder: s.sortOrder,
          active: s.active,
        }}
      />
    </Section>
  );
}

export default async function CataloguePage() {
  await requireCapability("catalogue:manage", {
    entity: "price_plans",
    action: "view",
    detail: "viewed services and prices",
  });

  const db = getDb();
  const [plans, offered] = await Promise.all([
    db.select().from(pricePlans).orderBy(asc(pricePlans.sortOrder), asc(pricePlans.name)),
    db.select().from(services).orderBy(asc(services.sortOrder), asc(services.name)),
  ]);
  const shown = offered.filter((s) => s.active);
  const hidden = offered.filter((s) => !s.active);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 24px 72px" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 800, color: "var(--navy)" }}>Services &amp; prices</h1>
      <p style={lead}>
        What the website offers and charges. Changes show on the website straight away and are recorded in Activity.
      </p>

      <h2 style={h2}>Prices</h2>
      <p style={lead}>
        One price list for the{" "}
        <Link href="/pricing" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>pricing page</Link>, the
        client&apos;s Buy sessions page and card payments. A change applies to new purchases; payments already made are
        not affected.
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

      <h2 style={h2}>Services</h2>
      <p style={lead}>
        The wording on the homepage and{" "}
        <Link href="/services" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>Our Services</Link>.
      </p>
      {shown.length === 0 ? <Empty>No services are shown on the website.</Empty> : shown.map(serviceSection)}
      {hidden.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 700, color: "var(--navy)" }}>
            Hidden services ({hidden.length})
          </summary>
          <div style={{ marginTop: 14 }}>{hidden.map(serviceSection)}</div>
        </details>
      )}
    </div>
  );
}
