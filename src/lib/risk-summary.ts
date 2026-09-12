/**
 * Summarising risk across a set of clients.
 *
 * Pure and dependency-free so it can be tested. This logic previously lived in
 * a correlated SQL subquery that silently matched nothing, hiding every risk
 * flag on the client list — a failure in the dangerous direction on a
 * safeguarding screen. Keeping it here means it can be asserted directly.
 */

export const RISK_RANK: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  immediate: 4,
};

export type RiskSummary = { highestRisk: string | null; openConcerns: number };

/**
 * Highest active risk level and open-concern count, per client.
 *
 * Callers must pass only *active* flags — an inactive (cleared) flag must not
 * raise someone's displayed level. Concerns are passed in full and filtered
 * here, so "closed" is defined in one place.
 */
export function summariseRisk(
  clientIds: string[],
  activeFlags: { clientId: string; level: string }[],
  concerns: { clientId: string; status: string }[]
): Map<string, RiskSummary> {
  const highest = new Map<string, string>();
  for (const f of activeFlags) {
    const current = highest.get(f.clientId);
    if (!current || (RISK_RANK[f.level] ?? 0) > (RISK_RANK[current] ?? 0)) {
      highest.set(f.clientId, f.level);
    }
  }

  const open = new Map<string, number>();
  for (const c of concerns) {
    if (c.status === "closed") continue;
    open.set(c.clientId, (open.get(c.clientId) ?? 0) + 1);
  }

  const out = new Map<string, RiskSummary>();
  for (const id of clientIds) {
    out.set(id, { highestRisk: highest.get(id) ?? null, openConcerns: open.get(id) ?? 0 });
  }
  return out;
}
