import type { Metadata } from "next";
import Link from "next/link";
import { Section, Empty } from "@/components/admin/RecordUI";
import { getLedger, quarterRange } from "@/lib/queries/accounting";
import { categoryLabel, withRunningBalance } from "@/lib/accounting";
import { formatPence } from "@/lib/revenue";
import { ExpenseForm } from "@/components/admin/ExpenseForm";

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
  const ledger = await getLedger(from, to);
  const rows = withRunningBalance(ledger.entries).reverse();

  return (
    <div style={{ maxWidth: 1050, margin: "0 auto", padding: "36px 24px 72px" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 800, color: "var(--navy)" }}>Accounting</h1>
      <p style={{ margin: "0 0 22px", fontSize: 14, color: "var(--navy-soft)", maxWidth: 660, lineHeight: 1.6 }}>
        A ledger to hand to an accountant, not a replacement for one. Nothing here is statutory
        bookkeeping. Income is read from settled payments and never typed in twice.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
        {QUARTERS.map((q) => {
          const r = quarterRange(q);
          return (
            <Link
              key={q}
              href={q === 0 ? "/admin/accounting" : `/admin/accounting?q=${q}`}
              style={{
                fontSize: 12.5, fontWeight: 700, padding: "6px 13px", borderRadius: 999,
                textDecoration: "none", border: "1px solid",
                borderColor: offset === q ? "var(--teal-deep)" : "rgba(31,58,95,0.16)",
                background: offset === q ? "var(--teal-deep)" : "#fff",
                color: offset === q ? "#fff" : "var(--navy)",
              }}
            >
              {r.from.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}–
              {r.to.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })}
            </Link>
          );
        })}
        <a
          href={`/admin/accounting/export?q=${offset}`}
          className="pill pill-ghost"
          style={{ padding: "8px 17px", fontSize: 12.5, marginLeft: "auto" }}
        >
          Export CSV
        </a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 30 }}>
        <Stat label="Income" value={formatPence(ledger.totals.incomePence)} />
        <Stat label="Expenses" value={formatPence(ledger.totals.expensePence)} />
        <Stat
          label="Balance"
          value={formatPence(ledger.totals.balancePence)}
          tone={ledger.totals.balancePence < 0 ? "bad" : "good"}
        />
        <Stat label="VAT on expenses" value={formatPence(ledger.totals.vatPence)} />
      </div>

      <Section title="Record an expense" subtitle="Attach the receipt where there is one — it is stored privately.">
        <ExpenseForm />
      </Section>

      <Section title={`${d(from)} to ${d(to)}`} subtitle={`${rows.length} entr${rows.length === 1 ? "y" : "ies"}, newest first`}>
        {rows.length === 0 ? (
          <Empty>Nothing recorded in this period.</Empty>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 760 }}>
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
                        <span style={{ fontSize: 11.5, color: "var(--navy-soft)" }}> · receipt on file</span>
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
          </div>
        )}
      </Section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div style={{ padding: "16px 18px", borderRadius: 12, background: "#fff", border: "1px solid rgba(31,58,95,0.1)" }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--navy-soft)", letterSpacing: "0.05em" }}>
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: 24, fontWeight: 800, marginTop: 7, fontVariantNumeric: "tabular-nums",
          color: tone === "bad" ? "#b4553f" : tone === "good" ? "var(--teal-deep)" : "var(--navy)",
        }}
      >
        {value}
      </div>
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
  ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--navy)", whiteSpace: "nowrap",
};
