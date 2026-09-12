import "server-only";

import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appointments,
  clients,
  consents,
  documents,
  intakeSubmissions,
  packages,
  referrals,
  riskFlags,
  safeguardingConcerns,
  sessionNotes,
  sessionNoteAmendments,
  users,
} from "@/db/schema";
import { requireCapability, requireClientAccess } from "@/lib/guard";
import { summariseRisk } from "@/lib/risk-summary";

export type ClientListRow = {
  id: string;
  preferredName: string;
  email: string;
  status: string;
  createdAt: Date;
  /** Highest active risk level, so the list can warn before anyone opens a record. */
  highestRisk: string | null;
  openConcerns: number;
};

/**
 * Client list for staff.
 *
 * Carries each client's highest active risk level and open-concern count so a
 * practitioner sees the warning in the list rather than discovering it after
 * opening the record.
 */
export async function listClients(search?: string): Promise<ClientListRow[]> {
  await requireCapability("client:read:any", {
    entity: "clients",
    action: "view",
    detail: search ? `client list search: "${search}"` : "client list",
  });

  const db = getDb();
  const term = search?.trim();

  const where = term
    ? or(ilike(clients.preferredName, `%${term}%`), ilike(clients.email, `%${term}%`))
    : undefined;

  const base = await db
    .select({
      id: clients.id,
      preferredName: clients.preferredName,
      email: clients.email,
      status: clients.status,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .where(where)
    .orderBy(desc(clients.createdAt))
    .limit(200);

  if (base.length === 0) return [];

  const ids = base.map((c) => c.id);

  /*
   * Risk and concern counts are fetched as their own queries and merged here
   * rather than as correlated subqueries.
   *
   * An earlier version used `sql` subqueries referencing ${clients.id}, which
   * Drizzle rendered as a bare "id" — inside the subquery that resolved to the
   * *flag's* own primary key, so the comparison never matched and every client
   * silently showed no risk flags. On a safeguarding screen that fails in the
   * dangerous direction, so this now uses plain queries whose behaviour is
   * obvious from reading them.
   */
  const [flagRows, concernRows] = await Promise.all([
    db
      .select({ clientId: riskFlags.clientId, level: riskFlags.level })
      .from(riskFlags)
      .where(and(inArray(riskFlags.clientId, ids), eq(riskFlags.active, true))),
    db
      .select({ clientId: safeguardingConcerns.clientId, status: safeguardingConcerns.status })
      .from(safeguardingConcerns)
      .where(inArray(safeguardingConcerns.clientId, ids)),
  ]);

  const summary = summariseRisk(ids, flagRows, concernRows);

  return base.map((c) => ({
    ...c,
    ...summary.get(c.id)!,
  }));
}

/**
 * A full client record.
 *
 * Loaded in one place so the audit entry describes the whole access rather
 * than a scattering of unrelated reads, and so no view can accidentally show a
 * record without having gone through `requireClientAccess`.
 */
export async function getClientRecord(clientId: string) {
  await requireClientAccess(clientId, {
    entity: "clients",
    entityId: clientId,
    action: "view",
    detail: "opened full client record",
  });

  const db = getDb();

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) return null;

  const [
    intake,
    flags,
    concerns,
    notes,
    appts,
    pkgs,
    consentRows,
    referralRows,
    docs,
  ] = await Promise.all([
    db
      .select()
      .from(intakeSubmissions)
      .where(eq(intakeSubmissions.clientId, clientId))
      .orderBy(desc(intakeSubmissions.submittedAt))
      .limit(1),
    db
      .select()
      .from(riskFlags)
      .where(and(eq(riskFlags.clientId, clientId), eq(riskFlags.active, true)))
      .orderBy(desc(riskFlags.raisedAt)),
    db
      .select()
      .from(safeguardingConcerns)
      .where(eq(safeguardingConcerns.clientId, clientId))
      .orderBy(desc(safeguardingConcerns.raisedAt)),
    db
      .select({
        id: sessionNotes.id,
        body: sessionNotes.body,
        agreedActions: sessionNotes.agreedActions,
        createdAt: sessionNotes.createdAt,
        supersededAt: sessionNotes.supersededAt,
        authorName: users.displayName,
        authorEmail: users.email,
      })
      .from(sessionNotes)
      .leftJoin(users, eq(users.id, sessionNotes.authorId))
      .where(eq(sessionNotes.clientId, clientId))
      .orderBy(desc(sessionNotes.createdAt)),
    db
      .select()
      .from(appointments)
      .where(eq(appointments.clientId, clientId))
      .orderBy(desc(appointments.startsAt)),
    db.select().from(packages).where(eq(packages.clientId, clientId)),
    db.select().from(consents).where(eq(consents.clientId, clientId)),
    db.select().from(referrals).where(eq(referrals.clientId, clientId)),
    db.select().from(documents).where(eq(documents.clientId, clientId)),
  ]);

  // Amendments are attached to their notes so the record reads as the original
  // text followed by its corrections, rather than two disconnected lists.
  const noteIds = notes.map((n) => n.id);
  const amendments = noteIds.length
    ? await db
        .select({
          id: sessionNoteAmendments.id,
          noteId: sessionNoteAmendments.noteId,
          body: sessionNoteAmendments.body,
          reason: sessionNoteAmendments.reason,
          createdAt: sessionNoteAmendments.createdAt,
        })
        .from(sessionNoteAmendments)
        .where(inArray(sessionNoteAmendments.noteId, noteIds))
        .orderBy(sessionNoteAmendments.createdAt)
    : [];

  const byNote = new Map<string, typeof amendments>();
  for (const a of amendments) {
    const list = byNote.get(a.noteId) ?? [];
    list.push(a);
    byNote.set(a.noteId, list);
  }

  return {
    client,
    intake: intake[0] ?? null,
    riskFlags: flags,
    concerns,
    notes: notes.map((n) => ({ ...n, amendments: byNote.get(n.id) ?? [] })),
    appointments: appts,
    packages: pkgs,
    consents: consentRows,
    referrals: referralRows,
    documents: docs,
  };
}

/** Counts for the admin dashboard. */
export async function getDashboardCounts() {
  const db = getDb();
  const [[clientCount], [openConcerns]] = await Promise.all([
    db.select({ n: count() }).from(clients),
    db
      .select({ n: count() })
      .from(safeguardingConcerns)
      .where(eq(safeguardingConcerns.status, "open")),
  ]);
  return { clients: clientCount.n, openConcerns: openConcerns.n };
}
