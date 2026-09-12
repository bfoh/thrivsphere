"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  incidents,
  referrals,
  riskFlags,
  safeguardingConcerns,
  sessionNoteAmendments,
  sessionNotes,
} from "@/db/schema";
import { requireCapability, requireClientAccess } from "@/lib/guard";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz";
import { shouldRaiseRiskFlag, validateConcern } from "@/lib/safeguarding-rules";
import type { SafeguardingState } from "@/lib/safeguarding-state";

function str(fd: FormData, name: string) {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}
const on = (fd: FormData, name: string) => fd.get(name) === "on";

function mapGuardError(err: unknown): SafeguardingState | null {
  if (err instanceof UnauthenticatedError) {
    return { status: "error", message: "Your session has expired. Please sign in again." };
  }
  if (err instanceof ForbiddenError) {
    return { status: "error", message: "You do not have permission to do that." };
  }
  return null;
}

/**
 * Raise a safeguarding concern.
 *
 * A concern at medium risk or above also raises a standing risk flag, so the
 * next practitioner to open the record sees it before the session rather than
 * having to read back through the history.
 */
export async function raiseConcern(
  _prev: SafeguardingState,
  formData: FormData
): Promise<SafeguardingState> {
  const clientId = str(formData, "clientId");
  if (!clientId) return { status: "error", message: "Missing client." };

  const consentRaw = str(formData, "consentToShare");
  const input = {
    category: str(formData, "category"),
    level: str(formData, "level"),
    detail: str(formData, "detail"),
    immediateAction: str(formData, "immediateAction"),
    clientInformed: on(formData, "clientInformed"),
    consentToShare: consentRaw === "" ? null : consentRaw === "yes",
    sharedWithoutConsentReason: str(formData, "sharedWithoutConsentReason"),
  };

  const fieldErrors = validateConcern(input);
  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "Please complete the highlighted fields.", fieldErrors };
  }

  let actor;
  try {
    actor = await requireCapability("safeguarding:write", {
      entity: "safeguarding_concerns",
      subjectClientId: clientId,
      action: "create",
      detail: `raised ${input.category} concern at ${input.level} risk`,
    });
    await requireClientAccess(clientId, {
      entity: "safeguarding_concerns",
      action: "create",
      detail: "raised a safeguarding concern",
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  const db = getDb();

  await db.insert(safeguardingConcerns).values({
    clientId,
    category: input.category as "adult_safeguarding",
    level: input.level as "low",
    detail: input.detail,
    immediateAction: input.immediateAction || null,
    clientInformed: input.clientInformed,
    consentToShare: input.consentToShare,
    sharedWithoutConsentReason: input.sharedWithoutConsentReason || null,
    raisedBy: actor.userId,
    status: "open",
  });

  if (shouldRaiseRiskFlag(input.level)) {
    await db.insert(riskFlags).values({
      clientId,
      category: input.category as "adult_safeguarding",
      level: input.level as "low",
      summary: input.detail.slice(0, 280),
      raisedBy: actor.userId,
      active: true,
    });
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/safeguarding");
  return { status: "ok", message: "Concern recorded." };
}

/** Escalate a concern to an external service, recording who and when. */
export async function escalateConcern(
  _prev: SafeguardingState,
  formData: FormData
): Promise<SafeguardingState> {
  const concernId = str(formData, "concernId");
  const clientId = str(formData, "clientId");
  const escalatedTo = str(formData, "escalatedTo");

  if (!concernId) return { status: "error", message: "Missing concern." };
  if (escalatedTo.length < 3) {
    return {
      status: "error",
      message: "Record who this was escalated to.",
      fieldErrors: { escalatedTo: "Name the service or person contacted." },
    };
  }

  try {
    await requireCapability("safeguarding:escalate", {
      entity: "safeguarding_concerns",
      entityId: concernId,
      subjectClientId: clientId || null,
      action: "update",
      detail: `escalated to ${escalatedTo}`,
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  await getDb()
    .update(safeguardingConcerns)
    .set({ escalatedTo, escalatedAt: new Date(), status: "escalated" })
    .where(eq(safeguardingConcerns.id, concernId));

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/safeguarding");
  return { status: "ok", message: "Escalation recorded." };
}

/** Close a concern with an outcome. */
export async function closeConcern(
  _prev: SafeguardingState,
  formData: FormData
): Promise<SafeguardingState> {
  const concernId = str(formData, "concernId");
  const clientId = str(formData, "clientId");
  const outcome = str(formData, "outcome");

  if (!concernId) return { status: "error", message: "Missing concern." };
  if (outcome.length < 5) {
    return {
      status: "error",
      message: "Record the outcome before closing.",
      fieldErrors: { outcome: "What was the outcome?" },
    };
  }

  let actor;
  try {
    actor = await requireCapability("safeguarding:write", {
      entity: "safeguarding_concerns",
      entityId: concernId,
      subjectClientId: clientId || null,
      action: "update",
      detail: "closed a safeguarding concern",
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  await getDb()
    .update(safeguardingConcerns)
    .set({ status: "closed", outcome, closedAt: new Date(), closedBy: actor.userId })
    .where(eq(safeguardingConcerns.id, concernId));

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/safeguarding");
  return { status: "ok", message: "Concern closed." };
}

/**
 * Clear a standing risk flag.
 *
 * Flags are deactivated rather than deleted — that a risk was once present and
 * later stood down is itself part of the record.
 */
export async function clearRiskFlag(
  _prev: SafeguardingState,
  formData: FormData
): Promise<SafeguardingState> {
  const flagId = str(formData, "flagId");
  const clientId = str(formData, "clientId");
  if (!flagId) return { status: "error", message: "Missing flag." };

  try {
    await requireCapability("safeguarding:write", {
      entity: "risk_flags",
      entityId: flagId,
      subjectClientId: clientId || null,
      action: "update",
      detail: "cleared a risk flag",
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  await getDb()
    .update(riskFlags)
    .set({ active: false, clearedAt: new Date(), reviewedAt: new Date() })
    .where(eq(riskFlags.id, flagId));

  revalidatePath(`/admin/clients/${clientId}`);
  return { status: "ok", message: "Flag cleared." };
}

/** Record a referral or signpost made for a client. */
export async function recordReferral(
  _prev: SafeguardingState,
  formData: FormData
): Promise<SafeguardingState> {
  const clientId = str(formData, "clientId");
  const organisationName = str(formData, "organisationName");
  const reason = str(formData, "reason");

  if (!clientId) return { status: "error", message: "Missing client." };

  const fieldErrors: Record<string, string> = {};
  if (organisationName.length < 2) fieldErrors.organisationName = "Name the service.";
  if (reason.length < 5) fieldErrors.reason = "Why were they referred?";
  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "Please complete the highlighted fields.", fieldErrors };
  }

  let actor;
  try {
    actor = await requireCapability("referral:write", {
      entity: "referrals",
      subjectClientId: clientId,
      action: "create",
      detail: `referred to ${organisationName}`,
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  await getDb().insert(referrals).values({
    clientId,
    organisationName,
    reason,
    outcome: "pending",
    madeBy: actor.userId,
  });

  revalidatePath(`/admin/clients/${clientId}`);
  return { status: "ok", message: "Referral recorded." };
}

/**
 * Amend a session note.
 *
 * The original note is never edited. An amendment is appended with a required
 * reason and the original is marked superseded, so the record shows both what
 * was first written and what was corrected.
 */
export async function amendNote(
  _prev: SafeguardingState,
  formData: FormData
): Promise<SafeguardingState> {
  const noteId = str(formData, "noteId");
  const clientId = str(formData, "clientId");
  const body = str(formData, "body");
  const reason = str(formData, "reason");

  if (!noteId) return { status: "error", message: "Missing note." };

  const fieldErrors: Record<string, string> = {};
  if (body.length < 5) fieldErrors.body = "Write the correction.";
  if (reason.length < 5) fieldErrors.reason = "An amendment must say why it was needed.";
  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "Please complete the highlighted fields.", fieldErrors };
  }

  let actor;
  try {
    // Deliberately a higher bar than writing a note: amending someone's record
    // after the fact is a supervisor action.
    actor = await requireCapability("notes:amend", {
      entity: "session_note_amendments",
      entityId: noteId,
      subjectClientId: clientId || null,
      action: "create",
      detail: "amended a session note",
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  const db = getDb();
  await db.insert(sessionNoteAmendments).values({
    noteId,
    authorId: actor.userId,
    body,
    reason,
  });
  await db
    .update(sessionNotes)
    .set({ supersededAt: new Date() })
    .where(eq(sessionNotes.id, noteId));

  revalidatePath(`/admin/clients/${clientId}`);
  return { status: "ok", message: "Amendment added. The original note is unchanged." };
}

/** Log an incident, including a data breach. */
export async function reportIncident(
  _prev: SafeguardingState,
  formData: FormData
): Promise<SafeguardingState> {
  const type = str(formData, "type");
  const summary = str(formData, "summary");
  const detail = str(formData, "detail");
  const actionsTaken = str(formData, "actionsTaken");
  const occurredAt = str(formData, "occurredAt");
  const clientId = str(formData, "clientId");

  const fieldErrors: Record<string, string> = {};
  if (summary.length < 5) fieldErrors.summary = "Summarise what happened.";
  if (!occurredAt) fieldErrors.occurredAt = "When did it happen?";
  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "Please complete the highlighted fields.", fieldErrors };
  }

  let actor;
  try {
    actor = await requireCapability("incident:write", {
      entity: "incidents",
      subjectClientId: clientId || null,
      action: "create",
      detail: `reported a ${type} incident`,
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  await getDb().insert(incidents).values({
    clientId: clientId || null,
    type: (type || "other") as "other",
    summary,
    detail: detail || null,
    actionsTaken: actionsTaken || null,
    occurredAt: new Date(occurredAt),
    reportedBy: actor.userId,
    status: "open",
  });

  revalidatePath("/admin/safeguarding");
  if (clientId) revalidatePath(`/admin/clients/${clientId}`);
  return { status: "ok", message: "Incident logged." };
}
