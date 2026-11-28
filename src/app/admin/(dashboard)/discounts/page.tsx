import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability } from "@/lib/guard";
import { Section, Empty } from "@/components/admin/RecordUI";
import { CodeForm, EndDiscountButton } from "@/components/admin/DiscountForms";
import { listDiscountsForAdmin, planPrices } from "@/lib/queries/discounts";
import { describeDiscount, reasonLabel } from "@/lib/discounts";

export const metadata: Metadata = { title: "Discounts", robots: { index: false, follow: false } };

const day = (v: Date) => v.toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric" });
/** The last day a discount works: it ends at the start of the next UK day. */
const lastDay = (endsAt: Date) => day(new Date(endsAt.getTime() - 1));

const card: React.CSSProperties = { border: "1px solid rgba(31,58,95,0.1)", borderRadius: 12, padding: "13px 17px" };
const meta: React.CSSProperties = { marginTop: 4, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: "var(--navy-soft)" };

/**
 * Discount codes, and every client concession in force (founder and admins).
 * Concessions and free sessions are given on the client's record.
 */
export default async function DiscountsPage() {
  await requireCapability("discount:manage", { entity: "discounts", action: "view", detail: "viewed discounts" });
  const now = new Date();
  const [rows, plans] = await Promise.all([listDiscountsForAdmin(now), planPrices()]);
  const planName = (slugs: string[] | null) =>
    slugs ? slugs.map((s) => plans.find((p) => p.slug === s)?.name ?? s).join(", ") : "Everything";

  const codes = rows.filter((r) => r.kind === "code");
  const concessions = rows.filter((r) => r.kind === "client");

  return (
    <div className="adm-page">
      <h1 className="adm-title" style={{ margin: "0 0 6px" }}>Discounts</h1>
      <p style={{ margin: "0 0 24px", fontSize: 14, lineHeight: 1.6, color: "var(--navy-soft)" }}>
        Codes anyone who has them can enter before paying, and the concessions given to individual clients. To give a
        client a concession or free sessions, open their record under Clients. Discounts never stack: the client pays the
        lower price. Every change is logged in Activity.
      </p>

      <Section title="Discount codes" subtitle={`${codes.length} ${codes.length === 1 ? "code" : "codes"}, newest first`}>
        {codes.length === 0 ? (
          <Empty>No codes yet.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {codes.map((c) => (
              <div key={c.id} style={card}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 14, letterSpacing: "0.05em", color: "var(--navy)" }}>{c.code}</strong>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{describeDiscount(c)}</span>
                  <span style={{ fontSize: 12.5, color: "var(--navy-soft)" }}>{c.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 800, color: c.current ? "var(--teal-deep)" : "var(--muted)" }}>
                    {!c.active ? "Off" : c.current ? "Working" : c.endsAt && c.endsAt <= now ? "Ended" : "Not started"}
                  </span>
                </div>
                <div style={meta}>
                  <span>On: {planName(c.planSlugs)}</span>
                  <span>
                    Used {c.used}
                    {c.maxUses != null ? ` of ${c.maxUses}` : ""} · {c.maxUsesPerClient ?? 1} per client
                  </span>
                  {c.startsAt && <span>From {day(c.startsAt)}</span>}
                  {c.endsAt && <span>Until {lastDay(c.endsAt)}</span>}
                  <span>Created {day(c.createdAt)}{c.createdByName ? ` by ${c.createdByName}` : ""}</span>
                </div>
                {c.note && <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--navy-soft)" }}>Note: {c.note}</p>}
                {c.active && (
                  <div style={{ marginTop: 8 }}>
                    <EndDiscountButton discountId={c.id} kind="code" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <CodeForm plans={plans} />
      </Section>

      <Section title="Client concessions" subtitle={`${concessions.length} in force`}>
        {concessions.length === 0 ? (
          <Empty>No client has a concession. Give one from the client&apos;s record.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {concessions.map((c) => (
              <Link key={c.id} href={`/admin/clients/${c.clientId}#discounts`} style={{ ...card, display: "block", textDecoration: "none", color: "inherit" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 13.5, color: "var(--navy)" }}>{c.clientName ?? "Client"}</strong>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{describeDiscount(c)}</span>
                  <span style={{ fontSize: 12.5, color: "var(--navy-soft)" }}>{c.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 800, color: c.current ? "var(--teal-deep)" : "var(--muted)" }}>
                    {c.current ? "Working" : "Ended"}
                  </span>
                </div>
                <div style={meta}>
                  <span>On: {planName(c.planSlugs)}</span>
                  <span>Used {c.used}{c.maxUses != null ? ` of ${c.maxUses}` : ""}</span>
                  {c.endsAt && <span>Until {lastDay(c.endsAt)}</span>}
                  <span>{reasonLabel(c.reason)}</span>
                  <span>Given {day(c.createdAt)}{c.createdByName ? ` by ${c.createdByName}` : ""}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
