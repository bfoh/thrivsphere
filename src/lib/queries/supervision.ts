import "server-only";

import { and, asc, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appointments,
  clients,
  preparationTasks,
  supervisionRecordAmendments,
  supervisionRecords,
  users,
} from "@/db/schema";
import { requireCapability, requireCapabilityForClient } from "@/lib/guard";
import { readAnswers } from "@/lib/forms/answers";

/**
 * Supervision sheets and the preparation tasks they create.
 *
 * Every function here goes through the guard, so a sheet can't be shown
 * anywhere without its read being written to the access log.
 */

const nameOf = (u: { displayName: string | null; email: string } | null | undefined) =>
  u ? u.displayName || u.email : null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Every id-shaped string in stored answers, however nested. */
function idsInAnswers(value: unknown): string[] {
  if (typeof value === "string") return UUID.test(value) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(idsInAnswers);
  if (value && typeof value === "object") return Object.values(value).flatMap(idsInAnswers);
  return [];
}

/** One sheet, with its amendments and tasks, for the sheet page. */
export async function getSupervisionRecord(recordId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: supervisionRecords.id, clientId: supervisionRecords.clientId })
    .from(supervisionRecords)
    .where(eq(supervisionRecords.id, recordId))
    .limit(1);
  if (!row) return null;

  await requireCapabilityForClient("supervision:read", row.clientId, {
    entity: "supervision_records",
    entityId: recordId,
    action: "view",
    detail: "opened a supervision sheet",
  });

  const [[record], [client], amendments, tasks] = await Promise.all([
    db.select().from(supervisionRecords).where(eq(supervisionRecords.id, recordId)).limit(1),
    db
      .select({ id: clients.id, preferredName: clients.preferredName })
      .from(clients)
      .where(eq(clients.id, row.clientId))
      .limit(1),
    db
      .select()
      .from(supervisionRecordAmendments)
      .where(eq(supervisionRecordAmendments.recordId, recordId))
      .orderBy(asc(supervisionRecordAmendments.createdAt)),
    db
      .select()
      .from(preparationTasks)
      .where(eq(preparationTasks.recordId, recordId))
      .orderBy(asc(preparationTasks.createdAt)),
  ]);
  if (!record || !client) return null;

  const appointment = record.appointmentId
    ? (
        await db
          .select({ id: appointments.id, startsAt: appointments.startsAt, status: appointments.status })
          .from(appointments)
          .where(eq(appointments.id, record.appointmentId))
          .limit(1)
      )[0] ?? null
    : null;

  // Everyone named on the sheet — in its columns and inside its answers
  // (who will act, who prepares what) — resolved once.
  const ids = [
    ...idsInAnswers(record.answers),
    record.practitionerId,
    record.createdBy,
    record.updatedBy,
    record.finalisedBy,
    ...amendments.map((a) => a.authorId),
    ...tasks.flatMap((t) => [t.assigneeId, t.doneBy]),
  ].filter((v): v is string => !!v);
  const people = ids.length
    ? await db
        .select({ id: users.id, displayName: users.displayName, email: users.email })
        .from(users)
        .where(inArray(users.id, [...new Set(ids)]))
    : [];
  const names = new Map(people.map((p) => [p.id, nameOf(p)!]));

  return {
    record: { ...record, answers: readAnswers(record.answers) },
    client,
    appointment,
    amendments,
    tasks,
    names,
  };
}

/** Sheets on one client's record, newest first. The record page has already audited the open. */
export async function listSupervisionForClient(clientId: string) {
  return getDb()
    .select({
      id: supervisionRecords.id,
      status: supervisionRecords.status,
      supervisionDate: supervisionRecords.supervisionDate,
      needsFollowUp: supervisionRecords.needsFollowUp,
      appointmentId: supervisionRecords.appointmentId,
      updatedAt: supervisionRecords.updatedAt,
      practitionerName: users.displayName,
      practitionerEmail: users.email,
    })
    .from(supervisionRecords)
    .leftJoin(users, eq(users.id, supervisionRecords.practitionerId))
    .where(eq(supervisionRecords.clientId, clientId))
    .orderBy(desc(supervisionRecords.supervisionDate), desc(supervisionRecords.createdAt));
}

/** The latest sheet for an appointment, so "start a sheet" opens the existing one instead. */
export async function findSheetForAppointment(appointmentId: string) {
  const [row] = await getDb()
    .select({ id: supervisionRecords.id, clientId: supervisionRecords.clientId })
    .from(supervisionRecords)
    .where(eq(supervisionRecords.appointmentId, appointmentId))
    .orderBy(desc(supervisionRecords.createdAt))
    .limit(1);
  return row ?? null;
}

/** Recent sheets across every client, drafts first, for the Resources page. */
export async function listRecentSupervision(limit = 25) {
  await requireCapability("supervision:read", {
    entity: "supervision_records",
    action: "view",
    detail: "viewed recent supervision sheets",
  });

  return getDb()
    .select({
      id: supervisionRecords.id,
      clientId: supervisionRecords.clientId,
      clientName: clients.preferredName,
      status: supervisionRecords.status,
      supervisionDate: supervisionRecords.supervisionDate,
      needsFollowUp: supervisionRecords.needsFollowUp,
      updatedAt: supervisionRecords.updatedAt,
    })
    .from(supervisionRecords)
    .innerJoin(clients, eq(clients.id, supervisionRecords.clientId))
    .orderBy(asc(supervisionRecords.status), desc(supervisionRecords.updatedAt))
    .limit(limit);
}

/** Open preparation tasks for one colleague. */
export async function listOpenTasksFor(userId: string) {
  await requireCapability("supervision:read", {
    entity: "preparation_tasks",
    action: "view",
    detail: "viewed their preparation tasks",
  });

  return getDb()
    .select({
      id: preparationTasks.id,
      description: preparationTasks.description,
      dueBy: preparationTasks.dueBy,
      recordId: preparationTasks.recordId,
      clientId: preparationTasks.clientId,
      clientName: clients.preferredName,
    })
    .from(preparationTasks)
    .innerJoin(clients, eq(clients.id, preparationTasks.clientId))
    .where(and(eq(preparationTasks.assigneeId, userId), isNull(preparationTasks.doneAt)))
    .orderBy(asc(preparationTasks.dueBy), asc(preparationTasks.createdAt))
    .limit(50);
}

/**
 * Sessions a sheet can be about: this client's completed sessions, and booked
 * ones whose start has passed but which nobody has marked yet — newest first.
 */
export async function listSessionsForSheet(clientId: string) {
  return getDb()
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      status: appointments.status,
      practitionerId: appointments.practitionerId,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.clientId, clientId),
        or(
          eq(appointments.status, "completed"),
          and(eq(appointments.status, "scheduled"), lt(appointments.startsAt, new Date()))
        )
      )
    )
    .orderBy(desc(appointments.startsAt))
    .limit(30);
}

/** Clients a new sheet or worksheet can be started for, by name. */
export async function listClientsForPicker() {
  await requireCapability("supervision:read", {
    entity: "clients",
    action: "view",
    detail: "listed clients to start a supervision sheet",
  });
  return getDb()
    .select({ id: clients.id, preferredName: clients.preferredName })
    .from(clients)
    .where(inArray(clients.status, ["registered", "active", "paused", "enquiry"]))
    .orderBy(asc(clients.preferredName))
    .limit(500);
}
