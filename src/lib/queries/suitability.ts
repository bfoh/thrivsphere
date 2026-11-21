import "server-only";

import { and, eq, inArray, lt, max, or } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, clients, suitabilityDecisions } from "@/db/schema";
import { outcomeDue } from "@/lib/suitability-rules";

/**
 * Clients who have had their Initial Wellbeing Consultation but have no
 * decision recorded since it, oldest first. Their ongoing sessions stay
 * closed until one is, so these are listed on the dashboard.
 *
 * A consultation counts once it is marked completed, or once its time has
 * passed while it is still marked booked (not yet closed).
 */
export async function listOutcomesDue(now: Date = new Date()) {
  const db = getDb();
  const consulted = await db
    .select({ clientId: appointments.clientId, at: max(appointments.startsAt) })
    .from(appointments)
    .where(
      and(
        eq(appointments.kind, "initial"),
        or(
          eq(appointments.status, "completed"),
          and(eq(appointments.status, "scheduled"), lt(appointments.endsAt, now))
        )
      )
    )
    .groupBy(appointments.clientId);
  if (consulted.length === 0) return [];

  const ids = consulted.map((c) => c.clientId);
  const [decided, names] = await Promise.all([
    db
      .select({ clientId: suitabilityDecisions.clientId, at: max(suitabilityDecisions.decidedAt) })
      .from(suitabilityDecisions)
      .where(inArray(suitabilityDecisions.clientId, ids))
      .groupBy(suitabilityDecisions.clientId),
    db.select({ id: clients.id, name: clients.preferredName }).from(clients).where(inArray(clients.id, ids)),
  ]);
  const lastDecision = new Map(decided.map((d) => [d.clientId, d.at]));
  const nameOf = new Map(names.map((n) => [n.id, n.name]));

  return consulted
    .filter((c) => c.at && outcomeDue({ consultationCompletedAt: c.at, latestDecisionAt: lastDecision.get(c.clientId) ?? null }))
    .map((c) => ({ clientId: c.clientId, name: nameOf.get(c.clientId) ?? "Client", consultedAt: c.at! }))
    .sort((a, b) => a.consultedAt.getTime() - b.consultedAt.getTime());
}
