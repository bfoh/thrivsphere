import type { Metadata } from "next";
import { requireCapability } from "@/lib/guard";
import { Section, Empty } from "@/components/admin/RecordUI";
import { aiSpendThisMonth, aiUsageReport } from "@/lib/queries/marketing";
import { monthlyBudgetUsd, usd } from "@/lib/ai/budget-rules";
import { h1, lead, page } from "@/components/admin/marketing/ui";
import { TASKS, isTaskKey } from "@/lib/ai/tasks";

const featureLabel = (f: string) => (isTaskKey(f) ? TASKS[f].label : f);

export const metadata: Metadata = { title: "AI usage", robots: { index: false, follow: false } };

const dt = (v: Date) => v.toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** What AI help has cost this month, against the limit. The founder's page. */
export default async function AiUsagePage() {
  await requireCapability("analytics:read", { entity: "ai_usage", action: "view", detail: "viewed AI usage" });
  const [spent, report] = await Promise.all([aiSpendThisMonth(), aiUsageReport()]);
  const budget = monthlyBudgetUsd();
  const share = Math.min(100, Math.round((spent / budget) * 100));
  const on = !!process.env.ANTHROPIC_API_KEY;

  return (
    <div style={page}>
      <h1 style={h1}>AI usage</h1>
      <p style={lead}>
        Every request for AI help is recorded here with what it cost (in US dollars, as the AI companies charge). When this
        month&apos;s spending reaches the limit, AI help pauses until the 1st. What people typed and what the AI wrote are not kept here.
      </p>

      {!on && (
        <div className="card" style={{ padding: "14px 18px", marginBottom: 18, borderLeft: "4px solid var(--gold)", fontSize: 14, lineHeight: 1.55 }}>
          AI help isn&apos;t switched on yet. It needs an Anthropic account owned by the business; its key is then added to the website&apos;s settings.
        </div>
      )}

      <Section title="This month" subtitle={`Limit: ${usd(budget)} a month`}>
        <p style={{ margin: "0 0 10px", fontSize: 28, fontWeight: 800, color: "var(--navy)" }}>
          {usd(spent)} <span style={{ fontSize: 14, fontWeight: 600, color: "var(--navy-soft)" }}>spent, {share}% of the limit</span>
        </p>
        <div role="meter" aria-label="Share of this month's AI limit used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={share} style={{ height: 10, borderRadius: 999, background: "rgba(31,58,95,0.08)", overflow: "hidden", maxWidth: 480 }}>
          <div style={{ height: "100%", width: `${share}%`, background: share >= 90 ? "#a1421c" : share >= 70 ? "var(--gold)" : "var(--teal)" }} />
        </div>
      </Section>

      <Section title="By feature">
        {report.byFeature.length === 0 ? (
          <Empty>No AI requests this month.</Empty>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr>{["Feature", "Requests", "Didn't work", "Cost"].map((h) => <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 12, color: "var(--navy-soft)" }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {report.byFeature.map((f) => (
                <tr key={f.feature} style={{ borderTop: "1px solid rgba(31,58,95,0.08)" }}>
                  <td style={{ padding: 8 }}>{featureLabel(f.feature)}</td>
                  <td style={{ padding: 8 }}>{f.requests}</td>
                  <td style={{ padding: 8 }}>{f.failed}</td>
                  <td style={{ padding: 8, fontWeight: 700 }}>{usd(f.usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Latest requests">
        {report.recent.length === 0 ? (
          <Empty>Nothing yet.</Empty>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>{["When", "Who", "Feature", "Result", "Tokens in / out", "Cost"].map((h) => <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 12, color: "var(--navy-soft)" }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {report.recent.map(({ row, actorName }) => (
                  <tr key={row.id} style={{ borderTop: "1px solid rgba(31,58,95,0.08)" }}>
                    <td style={{ padding: 8, whiteSpace: "nowrap" }}>{dt(row.createdAt)}</td>
                    <td style={{ padding: 8 }}>{actorName ?? "—"}</td>
                    <td style={{ padding: 8 }}>{featureLabel(row.feature)}</td>
                    <td style={{ padding: 8 }}>{row.outcome}</td>
                    <td style={{ padding: 8 }}>{row.inputTokens.toLocaleString("en-GB")} / {row.outputTokens.toLocaleString("en-GB")}{row.images ? ` · ${row.images} image${row.images === 1 ? "" : "s"}` : ""}</td>
                    <td style={{ padding: 8, fontWeight: 700 }}>{usd(row.costMicroUsd / 1_000_000)}</td>
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
