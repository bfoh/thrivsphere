import type { Metadata } from "next";
import { Section, Empty } from "@/components/admin/RecordUI";
import { getLedger, getQuarterTotals, quarterRange } from "@/lib/queries/accounting";
import { categoryLabel, withRunningBalance } from "@/lib/accounting";
import { formatPence } from "@/lib/revenue";
import { ExpenseForm } from "@/components/admin/ExpenseForm";
import { PageHeader, Stat, Stats, TableWrap, Tabs } from "@/components/admin/ui";
import { ColumnChart } from "@/components/admin/ColumnChart";
import { axisPounds } from "@/lib/chart";

export const metadata: Metadata = { title: "Accounting", robots: { index: false, follow: false } };

const d = (v: Date) =>
  v.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const QUARTERS = [0, 1, 2, 3];

/**
 * Ledger.
 *
 * Feeds an accountant; it does not replace one. Income is read from settled
 * orders rather than re-entered, expenses are typed here, and the whole period
 * exports as CSV — which is the actual point of the page.
 */
export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const offset = QUARTERS.includes(Number(raw)) ? Number(raw) : 0;

  const { from, to } = quarterRange(offset);
  // The ledger first: it checks access and writes the audit row for the page.
  const ledger = await getLedger(from, to);
  const quarters = await getQuarterTotals(QUARTERS.length);
  const quarterName = (f: Date, t: Date) =>
    `${f.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}–${t.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })}`;
  const rows = withRunningBalance(ledger.entries).reverse();

  return (
    <div className="adm-page">
      <PageHeader
        title="Accounting"
        description="A ledger to hand to an accountant, not a replacement for one. Nothing here is statutory bookkeeping. Income is read from settled payments and never typed in twice."
        actions={
          <a href={`/admin/accounting/export?q=${offset}`} className="pill pill-ghost" style={{ padding: "0 16px", minHeight: 38, fontSize: 13.5 }}>
            Export CSV
          </a>
        }
      />

      <div style={{ marginBottom: 24 }}>
        <Tabs
          label="Quarter"
          items={QUARTERS.map((q) => {
            const r = quarterRange(q);
            return {
              label: quarterName(r.from, r.to),
              href: q === 0 ? "/admin/accounting" : `/admin/accounting?q=${q}`,
              active: offset === q,
            };
          })}
        />
      </div>

      <Stats>
        <Stat label="Income" value={formatPence(ledger.totals.incomePence)} />
        <Stat label="Expenses" value={formatPence(ledger.totals.expensePence)} />
        <Stat
          label="Balance"
          value={formatPence(ledger.totals.balancePence)}
          tone={ledger.totals.balancePence < 0 ? "danger" : undefined}
          hint={ledger.totals.balancePence < 0 ? "More out than in this quarter" : undefined}
        />
        <Stat label="VAT on expenses" value={formatPence(ledger.totals.vatPence)} />
      </Stats>

      {quarters.some((q) => q.incomePence > 0 || q.expensePence > 0) && (
        <Section title="Last four quarters" subtitle="Money in against money out">
          <ColumnChart
            label="Income and expenses for the last four quarters"
            series={["Income", "Expenses"]}
            format={formatPence}
            axisFormat={axisPounds}
            height={200}
            columns={quarters.map((q, i) => ({
              key: q.key,
              label: quarterName(q.from, q.to).replace(/ \d{4}$/, ""),
              fullLabel: quarterName(q.from, q.to),
              values: [q.incomePence, q.expensePence],
              current: QUARTERS.length - 1 - i === offset,
            }))}
          />
        </Section>
      )}

      <Section id="record-expense" title="Record an expense" subtitle="Attach the receipt where there is one — it is stored privately.">
        <ExpenseForm />
      </Section>

      <Section title={`${d(from)} to ${d(to)}`} subtitle={`${rows.length} entr${rows.length === 1 ? "y" : "ies"}, newest first`}>
        {rows.length === 0 ? (
          <Empty>Nothing recorded in this period.</Empty>
        ) : (
          <TableWrap>
            <table className="adm-table" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Category</th>
                  <th style={th}>Description</th>
                  <th style={th}>Supplier / client</th>
                  <th style={thNum}>Amount</th>
                  <th style={thNum}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.date.toISOString()}-${i}`}>
                    <td style={{ ...td, whiteSpace: "nowrap", color: "var(--navy-soft)" }}>{d(r.date)}</td>
                    <td style={td}>{categoryLabel(r.category)}</td>
                    <td style={{ ...td, color: "var(--navy)" }}>
                      {r.description}
                      {r.reference === "receipt on file" && (
                        <span style={{ fontSize: 12, color: "var(--navy-soft)" }}> · receipt on file</span>
                      )}
                    </td>
                    <td style={{ ...td, color: "var(--navy-soft)" }}>{r.counterparty ?? "—"}</td>
                    <td style={{ ...num, color: r.kind === "income" ? "var(--teal-deep)" : "#b4553f", fontWeight: 700 }}>
                      {r.kind === "income" ? "" : "−"}
                      {formatPence(r.amountPence).replace("−", "")}
                    </td>
                    <td style={num}>{formatPence(r.balancePence)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Section>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left" };
const thNum: React.CSSProperties = { textAlign: "right" };
const td: React.CSSProperties = {};
const num: React.CSSProperties = { textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: "var(--navy)" };
