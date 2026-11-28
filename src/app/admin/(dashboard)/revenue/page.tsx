import type { Metadata } from "next";
import Link from "next/link";
import { Section, Empty } from "@/components/admin/RecordUI";
import { getRevenue } from "@/lib/queries/revenue";
import { formatPence, percentChange } from "@/lib/revenue";
import { axisPounds } from "@/lib/chart";
import { ColumnChart } from "@/components/admin/ColumnChart";
import { PageHeader, Stat, Stats, TableWrap } from "@/components/admin/ui";

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

  return (
    <div className="adm-page">
      <PageHeader
        title="Revenue"
        description="Settled payments over the last twelve months. Income counts from the date the money arrived, not the date the order was raised."
      />

      <Stats>
        <Stat label="Settled, 12 months" value={formatPence(r.settledPence)} hint={`${r.paidOrders} payment${r.paidOrders === 1 ? "" : "s"}`} />
        <Stat
          label="This month"
          value={formatPence(thisMonth?.incomePence ?? 0)}
          hint={change === null ? "No comparison yet" : `${change >= 0 ? "+" : ""}${change}% on last month`}
        />
        <Stat label="Awaiting payment" value={formatPence(r.outstandingPence)} hint={`${r.pendingOrders} unpaid order${r.pendingOrders === 1 ? "" : "s"}`} />
        <Stat label="Average payment" value={formatPence(r.averageOrderPence)} hint={`${r.payingClients} client${r.payingClients === 1 ? "" : "s"} have paid`} />
      </Stats>

      <Section title="By month" subtitle="Settled income">
        {r.settledPence === 0 ? (
          <Empty>No settled payments yet.</Empty>
        ) : (
          <ColumnChart
            label="Settled income by month, last twelve months"
            series={["Income"]}
            format={formatPence}
            axisFormat={axisPounds}
            columns={r.months.map((m, i) => ({
              key: m.key,
              label: m.label.split(" ")[0],
              fullLabel: m.label,
              values: [m.incomePence],
              current: i === r.months.length - 1,
            }))}
          />
        )}
      </Section>

      <Section title="By plan" subtitle="What people actually buy">
        {r.byPlan.length === 0 ? (
          <Empty>Nothing sold yet.</Empty>
        ) : (
          <TableWrap>
          <table className="adm-table">
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
          </TableWrap>
        )}
      </Section>

      <Section title="By client" subtitle="Top twenty by income. Opening a record is logged.">
        {r.byClient.length === 0 ? (
          <Empty>No paying clients yet.</Empty>
        ) : (
          <TableWrap>
          <table className="adm-table">
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
          </TableWrap>
        )}
      </Section>

      <Section title="Delivery" subtitle="What the income represents in sessions">
        <Stats>
          <Stat label="Sessions delivered" value={String(r.sessionsDelivered)} hint="Attended sessions, all time" />
          <Stat
            label="Sessions owed"
            value={String(r.sessionsRemaining)}
            hint="Paid for, not yet delivered"
          />
          <Stat
            label="Sessions per client"
            value={r.averageSessionsPerClient === null ? "—" : String(r.averageSessionsPerClient)}
            hint="Average, per paying client"
          />
          <Stat label="Refunded" value={formatPence(r.refundedPence)} hint="All time" />
          <Stat
            label="Discounts given"
            value={formatPence(r.discountsGivenPence)}
            hint={`Off ${r.discountedOrders} payment${r.discountedOrders === 1 ? "" : "s"}, 12 months`}
          />
          <Stat
            label="Complimentary sessions"
            value={String(r.complimentarySessions)}
            hint={`Worth ${formatPence(r.complimentaryValuePence)} at full price, 12 months`}
          />
        </Stats>
        <p style={{ margin: "16px 0 0", fontSize: 13, lineHeight: 1.6, color: "var(--navy-soft)" }}>
          <strong style={{ color: "var(--navy)" }}>Sessions owed</strong> is money already received
          against work still to be delivered. It is a liability, not profit — worth remembering
          before treating the settled figure as available.
        </p>
      </Section>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left" };
const thNum: React.CSSProperties = { textAlign: "right" };
const td: React.CSSProperties = {};
const num: React.CSSProperties = { textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: "var(--navy)" };
