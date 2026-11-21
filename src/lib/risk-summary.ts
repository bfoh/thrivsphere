/**
 * Summarising safeguarding across a set of clients, for the client list.
 *
 * Pure and dependency-free so it can be tested. This logic previously lived in
 * a correlated SQL subquery that silently matched nothing, hiding every flag
 * on the client list — a failure in the dangerous direction on a
 * safeguarding screen. Keeping it here means it can be asserted directly.
 *
 * There are no risk levels: ThriveSphere does not score risk (the owner's
 * Safeguarding Incident / Concern Record, 21 November 2026). A client either
 * has an active safeguarding flag or not.
 */

export type RiskSummary = { flagged: boolean; openConcerns: number };

/**
 * Whether each client has an active flag, and how many concerns are open.
 *
 * Callers must pass only *active* flags — a flag that has been stood down must
 * not mark someone. Concerns are passed in full and filtered here, so "closed"
 * is defined in one place.
 */
export function summariseRisk(
  clientIds: string[],
  activeFlags: { clientId: string }[],
  concerns: { clientId: string; status: string }[]
): Map<string, RiskSummary> {
  const flagged = new Set(activeFlags.map((f) => f.clientId));

  const open = new Map<string, number>();
  for (const c of concerns) {
    if (c.status === "closed") continue;
    open.set(c.clientId, (open.get(c.clientId) ?? 0) + 1);
  }

  const out = new Map<string, RiskSummary>();
  for (const id of clientIds) {
    out.set(id, { flagged: flagged.has(id), openConcerns: open.get(id) ?? 0 });
  }
  return out;
}
