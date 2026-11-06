import "server-only";

import { and, asc, count, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, preparationTasks, users, worksheetAssignments } from "@/db/schema";
import { requireCapability, requireCapabilityForClient } from "@/lib/guard";
import { readAnswers } from "@/lib/forms/answers";

/**
 * Worksheets set for clients.
 *
 * Staff reads need `worksheet:manage`; a client's reads need
 * `worksheet:complete:own` and only ever reach their own record. Either way
 * the read is audited.
 */

const nameOf = (u: { displayName: string | null; email: string } | null | undefined) =>
  u ? u.displayName || u.email : null;

/** One worksheet, for staff. */
export async function getWorksheetForStaff(assignmentId: string) {
  const db = getDb();
  const [row] = await db
    .select({ clientId: worksheetAssignments.clientId })
    .from(worksheetAssignments)
    .where(eq(worksheetAssignments.id, assignmentId))
    .limit(1);
  if (!row) return null;

  await requireCapabilityForClient("worksheet:manage", row.clientId, {
    entity: "worksheet_assignments",
    entityId: assignmentId,
    action: "view",
    detail: "opened a client's worksheet",
  });

  const [[assignment], [client]] = await Promise.all([
    db.select().from(worksheetAssignments).where(eq(worksheetAssignments.id, assignmentId)).limit(1),
    db
      .select({ id: clients.id, preferredName: clients.preferredName })
      .from(clients)
      .where(eq(clients.id, row.clientId))
      .limit(1),
  ]);
  if (!assignment || !client) return null;

  const ids = [assignment.assignedBy, assignment.lastEditedBy, assignment.submittedBy, assignment.reviewedBy].filter(
    (v): v is string => !!v
  );
  const people = await db
    .select({ id: users.id, displayName: users.displayName, email: users.email, role: users.role })
    .from(users)
    .where(inArray(users.id, [...new Set(ids)]));
  const names = new Map(people.map((p) => [p.id, p.role === "client" ? "the client" : nameOf(p)!]));

  // A client's unsent answers stay theirs until they send them, so they are
  // not even loaded into the staff page. Answers a practitioner entered with
  // the client are shown, so the practitioner can carry on.
  const clientStarted = people.find((p) => p.id === assignment.lastEditedBy)?.role === "client";
  const open = assignment.status === "assigned" || assignment.status === "in_progress";
  const answers = open && clientStarted ? {} : readAnswers(assignment.answers);

  return { assignment: { ...assignment, answers }, client, names, clientStarted };
}

/** Worksheets on one client's record. The record page has already audited the open. */
export async function listWorksheetsForClient(clientId: string) {
  return getDb()
    .select({
      id: worksheetAssignments.id,
      templateKey: worksheetAssignments.templateKey,
      templateVersion: worksheetAssignments.templateVersion,
      status: worksheetAssignments.status,
      assignedAt: worksheetAssignments.assignedAt,
      submittedAt: worksheetAssignments.submittedAt,
      reviewedAt: worksheetAssignments.reviewedAt,
    })
    .from(worksheetAssignments)
    .where(eq(worksheetAssignments.clientId, clientId))
    .orderBy(desc(worksheetAssignments.assignedAt));
}

/** Sent back and not yet reviewed, across every client. */
export async function listWorksheetsAwaitingReview() {
  await requireCapability("worksheet:manage", {
    entity: "worksheet_assignments",
    action: "view",
    detail: "viewed worksheets awaiting review",
  });
  return getDb()
    .select({
      id: worksheetAssignments.id,
      clientId: worksheetAssignments.clientId,
      clientName: clients.preferredName,
      templateKey: worksheetAssignments.templateKey,
      templateVersion: worksheetAssignments.templateVersion,
      submittedAt: worksheetAssignments.submittedAt,
      assignedBy: worksheetAssignments.assignedBy,
    })
    .from(worksheetAssignments)
    .innerJoin(clients, eq(clients.id, worksheetAssignments.clientId))
    .where(eq(worksheetAssignments.status, "submitted"))
    .orderBy(asc(worksheetAssignments.submittedAt))
    .limit(100);
}

/** Dashboard counts. The dashboard page has already been guarded. */
export async function countResourceWork(userId: string) {
  const db = getDb();
  const [[toReview], [myTasks]] = await Promise.all([
    db.select({ n: count() }).from(worksheetAssignments).where(eq(worksheetAssignments.status, "submitted")),
    db
      .select({ n: count() })
      .from(preparationTasks)
      .where(and(eq(preparationTasks.assigneeId, userId), isNull(preparationTasks.doneAt))),
  ]);
  return { worksheetsToReview: toReview.n, myOpenTasks: myTasks.n };
}

/** The client's own worksheets, withdrawn ones left out. */
export async function listMyWorksheets(clientId: string) {
  await requireCapabilityForClient("worksheet:complete:own", clientId, {
    entity: "worksheet_assignments",
    action: "view",
    detail: "viewed their worksheets",
  });
  return getDb()
    .select({
      id: worksheetAssignments.id,
      templateKey: worksheetAssignments.templateKey,
      templateVersion: worksheetAssignments.templateVersion,
      status: worksheetAssignments.status,
      note: worksheetAssignments.note,
      assignedAt: worksheetAssignments.assignedAt,
      submittedAt: worksheetAssignments.submittedAt,
    })
    .from(worksheetAssignments)
    .where(and(eq(worksheetAssignments.clientId, clientId), ne(worksheetAssignments.status, "withdrawn")))
    .orderBy(desc(worksheetAssignments.assignedAt));
}

/** How many worksheets the client still has to send, for their overview. No audit: a count, not content. */
export async function countMyOpenWorksheets(clientId: string) {
  const [row] = await getDb()
    .select({ n: count() })
    .from(worksheetAssignments)
    .where(
      and(
        eq(worksheetAssignments.clientId, clientId),
        inArray(worksheetAssignments.status, ["assigned", "in_progress"])
      )
    );
  return row?.n ?? 0;
}

/** One of the client's own worksheets. Null for anyone else's, or a withdrawn one. */
export async function getMyWorksheet(clientId: string, assignmentId: string) {
  await requireCapabilityForClient("worksheet:complete:own", clientId, {
    entity: "worksheet_assignments",
    entityId: assignmentId,
    action: "view",
    detail: "opened their worksheet",
  });
  const [row] = await getDb()
    .select()
    .from(worksheetAssignments)
    .where(and(eq(worksheetAssignments.id, assignmentId), eq(worksheetAssignments.clientId, clientId)))
    .limit(1);
  if (!row || row.status === "withdrawn") return null;
  return { ...row, answers: readAnswers(row.answers) };
}
