"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, clients, users, worksheetAssignments } from "@/db/schema";
import { requireCapabilityForClient } from "@/lib/guard";
import { getCurrentActor } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { ForbiddenError, UnauthenticatedError, canAccessClient, isStaff } from "@/lib/authz";
import { formDataToRaw, parseAnswers } from "@/lib/forms/answers";
import { getTemplate, worksheetTemplate } from "@/lib/forms/registry";
import { nextWorksheetStatus, type WorksheetStatus } from "@/lib/resources-rules";
import { sendEmail } from "@/lib/email";
import { worksheetAssigned, worksheetSubmitted } from "@/lib/email-templates";
import { brand } from "@/data/site";
import type { ResourceFormState } from "@/lib/resources-state";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOTE_MAX = 500;

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

function revalidateWorksheet(clientId: string, assignmentId?: string) {
  revalidatePath(`/admin/clients/${clientId}`);
  if (assignmentId) revalidatePath(`/admin/clients/${clientId}/worksheets/${assignmentId}`);
  revalidatePath("/admin/resources");
  revalidatePath("/admin");
  revalidatePath("/portal");
  revalidatePath("/portal/worksheets");
  if (assignmentId) revalidatePath(`/portal/worksheets/${assignmentId}`);
}

/**
 * Set a worksheet for a client.
 *
 * The client is told by email that something is waiting — honouring the same
 * preference as reminders, and without saying what it is.
 */
export async function assignWorksheet(
  _prev: ResourceFormState,
  formData: FormData
): Promise<ResourceFormState> {
  const clientId = str(formData, "clientId");
  const templateKey = str(formData, "templateKey");
  const appointmentId = str(formData, "appointmentId");
  const note = str(formData, "note");

  if (!UUID.test(clientId)) return { status: "error", message: "Missing client." };

  let actor;
  try {
    actor = await requireCapabilityForClient("worksheet:manage", clientId, {
      entity: "worksheet_assignments",
      action: "create",
      detail: `set ${templateKey || "a worksheet"}`,
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  const template = worksheetTemplate(templateKey);
  if (!template) return { status: "error", message: "Choose a worksheet from the library.", fieldErrors: { templateKey: "Choose a worksheet." } };
  if (note.length > NOTE_MAX) {
    return { status: "error", message: `Keep the note under ${NOTE_MAX} characters.`, fieldErrors: { note: `Under ${NOTE_MAX} characters.` } };
  }

  const db = getDb();
  if (appointmentId) {
    const [appt] = UUID.test(appointmentId)
      ? await db.select({ clientId: appointments.clientId }).from(appointments).where(eq(appointments.id, appointmentId)).limit(1)
      : [];
    if (!appt || appt.clientId !== clientId) return { status: "error", message: "Choose one of this client's sessions." };
  }

  const [created] = await db
    .insert(worksheetAssignments)
    .values({
      clientId,
      appointmentId: appointmentId || null,
      templateKey: template.key,
      templateVersion: template.version,
      note: note || null,
      assignedBy: actor.userId,
    })
    .returning({ id: worksheetAssignments.id });

  // A worksheet that saved must not be reported as failed because the mail
  // provider had a bad minute.
  try {
    const [client] = await db
      .select({ email: clients.email, notify: clients.emailRemindersEnabled })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);
    if (client?.email && client.notify) {
      const e = worksheetAssigned();
      const sent = await sendEmail({ to: client.email, subject: e.subject, text: e.text, html: e.html });
      if (!sent.ok) console.error("[worksheets] client notification not sent:", sent.reason);
    }
  } catch (err) {
    console.error("[worksheets] client notification failed", err);
  }

  revalidateWorksheet(clientId, created.id);
  return { status: "ok", message: `${template.title} has been set. The client will find it in their account.` };
}

/**
 * Save answers, or send them in.
 *
 * Used by the client in their portal and by a practitioner entering answers
 * with the client in a session; the record shows which. Once sent, answers are
 * fixed, so whoever reviews them is reading what was sent.
 */
export async function saveWorksheetAnswers(
  _prev: ResourceFormState,
  formData: FormData
): Promise<ResourceFormState> {
  const assignmentId = str(formData, "assignmentId");
  const intent = str(formData, "intent") === "submit" ? "submit" : "save";
  const revision = Number(str(formData, "revision") || "0");
  if (!UUID.test(assignmentId)) return { status: "error", message: "That worksheet could not be found." };

  const current = await getCurrentActor();
  if (!current) return { status: "error", message: "Your session has expired. Please sign in again." };
  const by = isStaff(current) ? "staff" : "client";

  const db = getDb();
  const [assignment] = await db
    .select()
    .from(worksheetAssignments)
    .where(eq(worksheetAssignments.id, assignmentId))
    .limit(1);
  // The same answer whether it does not exist or belongs to someone else.
  if (!assignment) return { status: "error", message: "That worksheet could not be found." };

  let actor;
  try {
    actor = await requireCapabilityForClient(
      by === "staff" ? "worksheet:manage" : "worksheet:complete:own",
      assignment.clientId,
      {
        entity: "worksheet_assignments",
        entityId: assignmentId,
        action: "update",
        detail:
          intent === "submit"
            ? by === "staff"
              ? "entered and sent a worksheet with the client"
              : "sent a worksheet"
            : by === "staff"
              ? "entered worksheet answers with the client"
              : "saved worksheet progress",
      }
    );
  } catch (err) {
    if (err instanceof ForbiddenError) return { status: "error", message: "That worksheet could not be found." };
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  const status = nextWorksheetStatus(assignment.status as WorksheetStatus, intent, by);
  if (!status) {
    return {
      status: "error",
      message:
        assignment.status === "withdrawn"
          ? "This worksheet has been withdrawn."
          : "This worksheet has already been sent, so it can't be changed.",
    };
  }

  // A client's unsent answers are theirs until they send them. Staff can enter
  // answers on a worksheet nobody has started, or one they started with the
  // client, but not over the top of the client's own work in progress.
  if (by === "staff" && (await clientHasStarted(assignment.lastEditedBy))) {
    return {
      status: "error",
      message: "The client has started this worksheet themselves. Their answers will be here once they send it.",
    };
  }

  const template = getTemplate(assignment.templateKey, assignment.templateVersion);
  if (!template) return { status: "error", message: "This worksheet's version is no longer available." };

  const parsed = parseAnswers(template, formDataToRaw(formData), { strict: intent === "submit" });
  if (Object.keys(parsed.errors).length) {
    return {
      status: "error",
      message: parsed.errors._form ?? "Please check the highlighted answers.",
      fieldErrors: parsed.errors,
    };
  }

  const now = new Date();
  const [updated] = await db
    .update(worksheetAssignments)
    .set({
      answers: parsed.answers,
      status,
      revision: sql`${worksheetAssignments.revision} + 1`,
      lastEditedBy: actor.userId,
      startedAt: assignment.startedAt ?? now,
      updatedAt: now,
      ...(intent === "submit" ? { submittedAt: now, submittedBy: actor.userId } : {}),
    })
    .where(
      and(
        eq(worksheetAssignments.id, assignmentId),
        eq(worksheetAssignments.revision, revision),
        inArray(worksheetAssignments.status, ["assigned", "in_progress"])
      )
    )
    .returning({ revision: worksheetAssignments.revision });

  if (!updated) {
    return {
      status: "error",
      message: "This worksheet was changed somewhere else since you opened it. Copy anything you need, then reload the page.",
    };
  }

  // Tell whoever set it that it's back — never what it says. Not needed when
  // a practitioner entered it themselves.
  if (intent === "submit" && by === "client") {
    try {
      const [setter] = await db
        .select({ email: users.email, status: users.status })
        .from(users)
        .where(eq(users.id, assignment.assignedBy))
        .limit(1);
      const to = setter && setter.status === "active" ? setter.email : (process.env.ENQUIRY_TO_EMAIL ?? brand.email);
      const e = worksheetSubmitted({ clientId: assignment.clientId, assignmentId });
      const sent = await sendEmail({ to, subject: e.subject, text: e.text, html: e.html });
      if (!sent.ok) console.error("[worksheets] staff notification not sent:", sent.reason);
    } catch (err) {
      console.error("[worksheets] staff notification failed", err);
    }
  }

  revalidateWorksheet(assignment.clientId, assignmentId);
  const time = now.toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
  return {
    status: "ok",
    message:
      intent === "submit"
        ? by === "client"
          ? "Sent. Thank you — your practitioner will talk it through with you."
          : "Sent. The answers are now fixed and ready to review."
        : `Saved at ${time}.`,
    revision: updated.revision,
  };
}

/** Whether the last person to save answers was a client rather than staff. */
async function clientHasStarted(lastEditedBy: string | null): Promise<boolean> {
  if (!lastEditedBy) return false;
  const [u] = await getDb().select({ role: users.role }).from(users).where(eq(users.id, lastEditedBy)).limit(1);
  return u?.role === "client";
}

/** Staff: mark a sent worksheet as reviewed, or withdraw one not yet sent. */
async function staffTransition(
  formData: FormData,
  intent: "review" | "withdraw"
): Promise<ResourceFormState> {
  const assignmentId = str(formData, "assignmentId");
  if (!UUID.test(assignmentId)) return { status: "error", message: "Missing worksheet." };

  const db = getDb();
  const [assignment] = await db
    .select({ clientId: worksheetAssignments.clientId, status: worksheetAssignments.status })
    .from(worksheetAssignments)
    .where(eq(worksheetAssignments.id, assignmentId))
    .limit(1);
  if (!assignment) return { status: "error", message: "That worksheet could not be found." };

  let actor;
  try {
    actor = await requireCapabilityForClient("worksheet:manage", assignment.clientId, {
      entity: "worksheet_assignments",
      entityId: assignmentId,
      action: "update",
      detail: intent === "review" ? "marked a worksheet reviewed" : "withdrew a worksheet",
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  const status = nextWorksheetStatus(assignment.status as WorksheetStatus, intent, "staff");
  if (!status) {
    return {
      status: "error",
      message: intent === "review" ? "Only a worksheet that has been sent can be marked reviewed." : "A worksheet that has been sent can't be withdrawn.",
    };
  }

  const now = new Date();
  const [updated] = await db
    .update(worksheetAssignments)
    .set({
      status,
      updatedAt: now,
      revision: sql`${worksheetAssignments.revision} + 1`,
      ...(intent === "review" ? { reviewedAt: now, reviewedBy: actor.userId } : {}),
    })
    .where(and(eq(worksheetAssignments.id, assignmentId), eq(worksheetAssignments.status, assignment.status)))
    .returning({ id: worksheetAssignments.id });
  if (!updated) return { status: "error", message: "This worksheet changed in the meantime. Reload to see it." };

  revalidateWorksheet(assignment.clientId, assignmentId);
  return { status: "ok", message: intent === "review" ? "Marked as reviewed." : "Withdrawn. The client no longer sees it." };
}

export async function markWorksheetReviewed(_prev: ResourceFormState, formData: FormData): Promise<ResourceFormState> {
  return staffTransition(formData, "review");
}

export async function withdrawWorksheet(_prev: ResourceFormState, formData: FormData): Promise<ResourceFormState> {
  return staffTransition(formData, "withdraw");
}

/** Recorded when a printed copy is opened, so a paper copy leaving the building is on the log. */
export async function recordWorksheetPrint(assignmentId: string): Promise<void> {
  if (!UUID.test(assignmentId)) return;
  const actor = await getCurrentActor();
  if (!actor) return;
  const [row] = await getDb()
    .select({ clientId: worksheetAssignments.clientId })
    .from(worksheetAssignments)
    .where(eq(worksheetAssignments.id, assignmentId))
    .limit(1);
  if (!row || !canAccessClient(actor, row.clientId)) return;
  await recordAudit({
    actorId: actor.userId,
    action: "export",
    entity: "worksheet_assignments",
    entityId: assignmentId,
    subjectClientId: row.clientId,
    detail: "printed a worksheet",
  });
}
