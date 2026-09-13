import type { Metadata } from "next";
import Link from "next/link";
import { Section, Empty } from "@/components/admin/RecordUI";
import { getRevenue } from "@/lib/queries/revenue";
import { formatPence, percentChange } from "@/lib/revenue";

export const metadata: Metadata = { title: "Revenue", robots: { index: false, follow: false } };

/**
 * Revenue and analytics.
 *
 * Founder only. Income is recognised on the date payment settled, and prepaid
 * sessions not yet delivered are shown separately as what they are — money
 * received against work still owed, not profit.
 */
export default async function RevenuePage() {
  const r = await getRevenue(12);

  const thisMonth = r.months.at(-1);
  const lastMonth = r.months.at(-2);
  const change =
    thisMonth && lastMonth ? percentChange(thisMonth.incomePence, lastMonth.incomePence) : null;

  const peak = Math.max(1, ...r.months.map((m) => m.incomePence));

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 24px 72px" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 800, color: "var(--navy)" }}>Revenue</h1>
      <p style={{ margin: "0 0 26px", fontSize: 14, color: "var(--navy-soft)", maxWidth: 640, lineHeight: 1.6 }}>
        Settled payments over the last twelve months. Income counts from the date the money
        arrived, not the date the order was raised.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 30 }}>
        <Stat label="Settled, 12 months" value={formatPence(r.settledPence)} note={`${r.paidOrders} payment${r.paidOrders === 1 ? "" : "s"}`} />
        <Stat
          label="This month"
          value={formatPence(thisMonth?.incomePence ?? 0)}
          note={change === null ? "no comparison yet" : `${change >= 0 ? "+" : ""}${change}% on last month`}
        />
        <Stat label="Awaiting payment" value={formatPence(r.outstandingPence)} note={`${r.pendingOrders} unpaid order${r.pendingOrders === 1 ? "" : "s"}`} />
        <Stat label="Average payment" value={formatPence(r.averageOrderPence)} note={`${r.payingClients} client${r.payingClients === 1 ? "" : "s"} have paid`} />
      </div>

      <Section title="By month" subtitle="Settled income">
        {r.settledPence === 0 ? (
          <Empty>No settled payments yet.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {r.months.map((m) => (
              <div key={m.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 78, flexShrink: 0, fontSize: 12.5, color: "var(--navy-soft)", fontVariantNumeric: "tabular-nums" }}>
                  {m.label}
                </span>
                <span
                  aria-hidden
                  style={{
                    height: 16,
                    borderRadius: 4,
                    background: m.incomePence > 0 ? "var(--teal-deep)" : "rgba(31,58,95,0.08)",
                    width: `${Math.max(m.incomePence > 0 ? 2 : 1, (m.incomePence / peak) * 100)}%`,
                    minWidth: 4,
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {formatPence(m.incomePence)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="By plan" subtitle="What people actually buy">
        {r.byPlan.length === 0 ? (
          <Empty>Nothing sold yet.</Empty>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>{["Plan", "Sold", "Income", "Share"].map((h, i) => <th key={h} style={i === 0 ? th : thNum}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {r.byPlan.map((p) => (
                <tr key={p.name}>
                  <td style={{ ...td, color: "var(--navy)", fontWeight: 700 }}>{p.name}</td>
                  <td style={num}>{p.orders}</td>
                  <td style={num}>{formatPence(p.incomePence)}</td>
                  <td style={{ ...num, color: "var(--navy-soft)" }}>{p.share}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="By client" subtitle="Top twenty by income. Opening a record is logged.">
        {r.byClient.length === 0 ? (
          <Empty>No paying clients yet.</Empty>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>{["Client", "Payments", "Income", "Share"].map((h, i) => <th key={h} style={i === 0 ? th : thNum}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {r.byClient.map((c) => (
                <tr key={c.clientId}>
                  <td style={td}>
                    <Link href={`/admin/clients/${c.clientId}`} style={{ fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none" }}>
                      {c.name}
                    </Link>
                  </td>
                  <td style={num}>{c.orders}</td>
                  <td style={num}>{formatPence(c.incomePence)}</td>
                  <td style={{ ...num, color: "var(--navy-soft)" }}>{c.share}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Delivery" subtitle="What the income represents in sessions">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
          <Stat label="Sessions delivered" value={String(r.sessionsDelivered)} note="completed appointments, all time" />
          <Stat
            label="Sessions owed"
            value={String(r.sessionsRemaining)}
            note="paid for, not yet delivered"
          />
          <Stat
            label="Sessions per client"
            value={r.averageSessionsPerClient === null ? "—" : String(r.averageSessionsPerClient)}
            note="average, per paying client"
          />
          <Stat label="Refunded" value={formatPence(r.refundedPence)} note="all time" />
        </div>
        <p style={{ margin: "16px 0 0", fontSize: 13, lineHeight: 1.6, color: "var(--navy-soft)" }}>
          <strong style={{ color: "var(--navy)" }}>Sessions owed</strong> is money already received
          against work still to be delivered. It is a liability, not profit — worth remembering
          before treating the settled figure as available.
        </p>
      </Section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ padding: "16px 18px", borderRadius: 12, background: "#fff", border: "1px solid rgba(31,58,95,0.1)" }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--navy-soft)", letterSpacing: "0.05em" }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "var(--navy)", margin: "7px 0 3px", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      {note && <div style={{ fontSize: 12.5, color: "var(--navy-soft)", lineHeight: 1.45 }}>{note}</div>}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left", padding: "8px 12px 10px", fontSize: 11.5, fontWeight: 800,
  color: "var(--navy-soft)", borderBottom: "1px solid rgba(31,58,95,0.12)",
};
const thNum: React.CSSProperties = { ...th, textAlign: "right" };
const td: React.CSSProperties = {
  padding: "11px 12px", borderBottom: "1px solid rgba(31,58,95,0.07)",
};
const num: React.CSSProperties = {
  ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--navy)",
};
