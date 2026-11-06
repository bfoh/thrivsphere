"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appointments,
  preparationTasks,
  supervisionRecordAmendments,
  supervisionRecords,
} from "@/db/schema";
import { requireCapabilityForClient } from "@/lib/guard";
import { recordAudit } from "@/lib/audit";
import { ForbiddenError, UnauthenticatedError, can, canAccessClient } from "@/lib/authz";
import { getCurrentActor } from "@/lib/session";
import { formDataToRaw, parseAnswers } from "@/lib/forms/answers";
import { getTemplate, supervisionTemplate } from "@/lib/forms/registry";
import type { TaskRow } from "@/lib/forms/types";
import { getActiveStaff } from "@/lib/queries/availability";
import { sheetNeedsFollowUp } from "@/lib/resources-rules";
import type { ResourceFormState } from "@/lib/resources-state";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(fd: FormData, name: string) {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function mapGuardError(err: unknown): ResourceFormState | null {
  if (err instanceof UnauthenticatedError) {
    return { status: "error", message: "Your session has expired. Please sign in again." };
  }
  if (err instanceof ForbiddenError) {
    return { status: "error", message: "You do not have permission to do that." };
  }
  return null;
}

const londonToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });

function revalidateSheet(clientId: string, recordId?: string) {
  revalidatePath(`/admin/clients/${clientId}`);
  if (recordId) revalidatePath(`/admin/clients/${clientId}/supervision/${recordId}`);
  revalidatePath("/admin/resources");
  revalidatePath("/admin");
}

/**
 * Save a supervision sheet as a draft, or finalise it.
 *
 * A draft can be saved half-written by anyone on the team. Finalising checks
 * the sheet properly — the main issue, the safety section and the plan, plus
 * an owner and date for any concern — then locks it. A finalised sheet is
 * corrected by amendment, never edited, the same as a session note.
 *
 * Each draft carries a revision number. Two colleagues editing the same draft
 * cannot silently overwrite each other: the second save is refused and asked
 * to reload.
 */
export async function saveSupervisionRecord(
  _prev: ResourceFormState,
  formData: FormData
): Promise<ResourceFormState> {
  const intent = str(formData, "intent") === "finalise" ? "finalise" : "save";
  const recordId = str(formData, "recordId");
  const clientId = str(formData, "clientId");
  const appointmentId = str(formData, "appointmentId");
  const practitionerId = str(formData, "practitionerId");
  const supervisionDate = str(formData, "supervisionDate");
  const revision = Number(str(formData, "revision") || "0");

  if (!UUID.test(clientId)) return { status: "error", message: "Missing client." };
  if (recordId && !UUID.test(recordId)) return { status: "error", message: "That sheet could not be found." };

  let actor;
  try {
    actor = await requireCapabilityForClient("supervision:write", clientId, {
      entity: "supervision_records",
      entityId: recordId || null,
      action: recordId ? "update" : "create",
      // Worded as a request: the sheet has not been checked yet. A finalised
      // sheet gets its own row below once it is actually locked.
      detail: intent === "finalise" ? "supervision sheet finalise requested" : "supervision sheet draft saved",
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  const db = getDb();
  const staff = await getActiveStaff();
  const staffIds = new Set(staff.map((s) => s.id));

  // The header: checked here rather than in the template, because these are
  // columns the record is found by.
  const fieldErrors: Record<string, string> = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(supervisionDate) || Number.isNaN(Date.parse(supervisionDate))) {
    fieldErrors.supervisionDate = "Enter the date of the supervision.";
  } else if (supervisionDate > londonToday()) {
    fieldErrors.supervisionDate = "The supervision date can't be in the future.";
  }
  let sessionPractitionerId: string | null = null;
  if (appointmentId) {
    const [appt] = UUID.test(appointmentId)
      ? await db
          .select({ clientId: appointments.clientId, practitionerId: appointments.practitionerId })
          .from(appointments)
          .where(eq(appointments.id, appointmentId))
          .limit(1)
      : [];
    if (!appt || appt.clientId !== clientId) fieldErrors.appointmentId = "Choose one of this client's sessions.";
    else sessionPractitionerId = appt.practitionerId;
  }

  // An existing draft keeps the template version it was started on.
  let existing: typeof supervisionRecords.$inferSelect | undefined;
  if (recordId) {
    [existing] = await db.select().from(supervisionRecords).where(eq(supervisionRecords.id, recordId)).limit(1);
    if (!existing || existing.clientId !== clientId) {
      return { status: "error", message: "That sheet could not be found." };
    }
    if (existing.status !== "draft") {
      return { status: "error", message: "This sheet has been finalised. Add an amendment instead." };
    }
  }

  // Usually a current colleague; but the person who ran the session may have
  // left since, and the sheet must still be able to name them.
  const knownPractitioner =
    staffIds.has(practitionerId) ||
    practitionerId === existing?.practitionerId ||
    (!!sessionPractitionerId && practitionerId === sessionPractitionerId);
  if (!knownPractitioner) fieldErrors.practitionerId = "Choose the practitioner who ran the session.";
  const template = existing ? getTemplate(existing.templateKey, existing.templateVersion) : supervisionTemplate();
  if (!template) return { status: "error", message: "This sheet's form version is no longer available." };

  const parsed = parseAnswers(template, formDataToRaw(formData), { strict: intent === "finalise", staffIds });
  Object.assign(fieldErrors, parsed.errors);
  if (Object.keys(fieldErrors).length) {
    return {
      status: "error",
      message:
        intent === "finalise"
          ? "The sheet isn't ready to finalise yet. Please complete the highlighted questions."
          : "Please correct the highlighted answers.",
      fieldErrors,
    };
  }

  const now = new Date();
  const finalising = intent === "finalise";
  const needsFollowUp = sheetNeedsFollowUp(parsed.answers);
  const header = {
    appointmentId: appointmentId || null,
    practitionerId,
    supervisionDate,
    answers: parsed.answers,
    needsFollowUp,
    updatedBy: actor.userId,
    updatedAt: now,
    ...(finalising ? { status: "final" as const, finalisedAt: now, finalisedBy: actor.userId } : {}),
  };

  let id = recordId;
  let newRevision = 1;
  if (!existing) {
    const [created] = await db
      .insert(supervisionRecords)
      .values({
        ...header,
        clientId,
        templateKey: template.key,
        templateVersion: template.version,
        createdBy: actor.userId,
      })
      .returning({ id: supervisionRecords.id });
    id = created.id;
  } else {
    // Only a draft, and only the revision this person loaded.
    const [updated] = await db
      .update(supervisionRecords)
      .set({ ...header, revision: sql`${supervisionRecords.revision} + 1` })
      .where(
        and(
          eq(supervisionRecords.id, recordId),
          eq(supervisionRecords.status, "draft"),
          eq(supervisionRecords.revision, revision)
        )
      )
      .returning({ revision: supervisionRecords.revision });
    if (!updated) {
      return {
        status: "error",
        message:
          "Someone else has saved or finalised this sheet since you opened it. Copy anything you need, then reload the page to see their version.",
      };
    }
    newRevision = updated.revision;
  }

  if (finalising) {
    const rows = (parsed.answers.tasks as TaskRow[] | undefined) ?? [];
    if (rows.length) {
      await db.insert(preparationTasks).values(
        rows.map((t) => ({
          recordId: id,
          clientId,
          description: t.description,
          assigneeId: t.assigneeId,
          dueBy: t.dueBy,
        }))
      );
    }
  }

  if (finalising) {
    await recordAudit({
      actorId: actor.userId,
      action: existing ? "update" : "create",
      entity: "supervision_records",
      entityId: id,
      subjectClientId: clientId,
      detail: needsFollowUp ? "finalised a supervision sheet (section 3 flags a concern)" : "finalised a supervision sheet",
    });
  }

  revalidateSheet(clientId, id);

  // A brand-new sheet now has a page of its own.
  if (!existing) redirect(`/admin/clients/${clientId}/supervision/${id}`);

  return {
    status: "ok",
    message: finalising
      ? "Sheet finalised. It is now locked; corrections are added as amendments."
      : `Draft saved at ${now.toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" })}.`,
    revision: newRevision,
    concernFlagged: needsFollowUp,
  };
}

/** Add a correction to a finalised sheet. A supervisor action, as for session notes. */
export async function amendSupervisionRecord(
  _prev: ResourceFormState,
  formData: FormData
): Promise<ResourceFormState> {
  const recordId = str(formData, "recordId");
  const body = str(formData, "body");
  const reason = str(formData, "reason");
  if (!UUID.test(recordId)) return { status: "error", message: "Missing sheet." };

  const fieldErrors: Record<string, string> = {};
  if (body.length < 5) fieldErrors.body = "Write the correction.";
  if (body.length > 4000) fieldErrors.body = "Keep this under 4,000 characters.";
  if (reason.length < 5) fieldErrors.reason = "An amendment must say why it was needed.";
  if (reason.length > 500) fieldErrors.reason = "Keep this under 500 characters.";
  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "Please complete the highlighted fields.", fieldErrors };
  }

  const db = getDb();
  const [record] = await db
    .select({ clientId: supervisionRecords.clientId, status: supervisionRecords.status })
    .from(supervisionRecords)
    .where(eq(supervisionRecords.id, recordId))
    .limit(1);
  if (!record) return { status: "error", message: "That sheet could not be found." };

  let actor;
  try {
    actor = await requireCapabilityForClient("notes:amend", record.clientId, {
      entity: "supervision_record_amendments",
      entityId: recordId,
      action: "create",
      detail: "amended a supervision sheet",
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  if (record.status !== "final") {
    return { status: "error", message: "A draft can still be edited directly." };
  }

  await db.insert(supervisionRecordAmendments).values({ recordId, authorId: actor.userId, body, reason });

  revalidateSheet(record.clientId, recordId);
  return { status: "ok", message: "Amendment added. The sheet itself is unchanged." };
}

/** Tick a preparation task done, or untick it. */
export async function setPreparationTaskDone(
  _prev: ResourceFormState,
  formData: FormData
): Promise<ResourceFormState> {
  const taskId = str(formData, "taskId");
  const done = str(formData, "done") === "true";
  if (!UUID.test(taskId)) return { status: "error", message: "Missing task." };

  const db = getDb();
  const [task] = await db
    .select({ clientId: preparationTasks.clientId, recordId: preparationTasks.recordId })
    .from(preparationTasks)
    .where(eq(preparationTasks.id, taskId))
    .limit(1);
  if (!task) return { status: "error", message: "That task could not be found." };

  let actor;
  try {
    actor = await requireCapabilityForClient("supervision:write", task.clientId, {
      entity: "preparation_tasks",
      entityId: taskId,
      action: "update",
      detail: done ? "marked a preparation task done" : "reopened a preparation task",
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  await db
    .update(preparationTasks)
    .set(done ? { doneAt: new Date(), doneBy: actor.userId } : { doneAt: null, doneBy: null })
    .where(eq(preparationTasks.id, taskId));

  revalidateSheet(task.clientId, task.recordId);
  return { status: "ok", message: done ? "Done." : "Reopened." };
}

/**
 * Delete a draft that should not have been started.
 *
 * Only a draft — a finalised sheet is part of the record — and only by the
 * colleague who started it or someone who can amend records.
 */
export async function deleteSupervisionDraft(
  _prev: ResourceFormState,
  formData: FormData
): Promise<ResourceFormState> {
  const recordId = str(formData, "recordId");
  if (!UUID.test(recordId)) return { status: "error", message: "Missing sheet." };

  const db = getDb();
  const [record] = await db
    .select({ clientId: supervisionRecords.clientId, status: supervisionRecords.status, createdBy: supervisionRecords.createdBy })
    .from(supervisionRecords)
    .where(eq(supervisionRecords.id, recordId))
    .limit(1);
  if (!record) return { status: "error", message: "That sheet could not be found." };

  let actor;
  try {
    actor = await requireCapabilityForClient("supervision:write", record.clientId, {
      entity: "supervision_records",
      entityId: recordId,
      action: "delete",
      detail: "supervision sheet draft deletion requested",
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  if (record.status !== "draft") return { status: "error", message: "A finalised sheet can't be deleted." };
  if (record.createdBy !== actor.userId && !can(actor, "notes:amend")) {
    return { status: "error", message: "Only the colleague who started this draft, or a supervisor, can delete it." };
  }

  const deleted = await db
    .delete(supervisionRecords)
    .where(and(eq(supervisionRecords.id, recordId), eq(supervisionRecords.status, "draft")))
    .returning({ id: supervisionRecords.id });
  if (!deleted.length) return { status: "error", message: "This sheet was finalised in the meantime, so it was kept." };

  await recordAudit({
    actorId: actor.userId,
    action: "delete",
    entity: "supervision_records",
    entityId: recordId,
    subjectClientId: record.clientId,
    detail: "deleted a supervision sheet draft",
  });

  revalidateSheet(record.clientId);
  redirect(`/admin/clients/${record.clientId}`);
}

/** Recorded when a sheet is printed, so a paper copy is on the access log. */
export async function recordSupervisionPrint(recordId: string): Promise<void> {
  if (!UUID.test(recordId)) return;
  const actor = await getCurrentActor();
  if (!actor || !can(actor, "supervision:read")) return;
  const [row] = await getDb()
    .select({ clientId: supervisionRecords.clientId })
    .from(supervisionRecords)
    .where(eq(supervisionRecords.id, recordId))
    .limit(1);
  if (!row || !canAccessClient(actor, row.clientId)) return;
  await recordAudit({
    actorId: actor.userId,
    action: "export",
    entity: "supervision_records",
    entityId: recordId,
    subjectClientId: row.clientId,
    detail: "printed a supervision sheet",
  });
}
