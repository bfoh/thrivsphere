"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { absences, staffProfiles, trainingRecords, users } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz";
import { parseDate } from "@/lib/hr-rules";
import type { HrFormState } from "@/lib/hr-state";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function orNull(fd: FormData, name: string): string | null {
  return str(fd, name) || null;
}

function mapGuardError(err: unknown): HrFormState | null {
  if (err instanceof UnauthenticatedError) {
    return { status: "error", message: "Your session has expired. Please sign in again." };
  }
  if (err instanceof ForbiddenError) {
    return { status: "error", message: "You do not have access to staff records." };
  }
  return null;
}

/** Create or update the employment record attached to a staff account. */
export async function saveStaffProfile(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  const userId = str(formData, "userId");

  let actor;
  try {
    actor = await requireCapability("hr:manage", {
      entity: "staff_profiles",
      entityId: userId,
      action: "update",
      detail: "updated a staff record",
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) return { status: "error", message: "That account no longer exists." };
  if (target.role === "client") {
    return { status: "error", message: "That is a client account, not a staff account." };
  }

  const values = {
    userId,
    jobTitle: orNull(formData, "jobTitle"),
    contract: (str(formData, "contract") || "self_employed") as "self_employed",
    startedOn: orNull(formData, "startedOn"),
    dbsNumber: orNull(formData, "dbsNumber"),
    dbsCheckedOn: orNull(formData, "dbsCheckedOn"),
    dbsReviewDue: orNull(formData, "dbsReviewDue"),
    supervisionDue: orNull(formData, "supervisionDue"),
    supervisorName: orNull(formData, "supervisorName"),
    emergencyContactName: orNull(formData, "emergencyContactName"),
    emergencyContactPhone: orNull(formData, "emergencyContactPhone"),
    notes: orNull(formData, "notes"),
    updatedAt: new Date(),
  };

  await db
    .insert(staffProfiles)
    .values(values)
    .onConflictDoUpdate({ target: staffProfiles.userId, set: values });

  revalidatePath("/admin/hr");
  return { status: "ok", message: `Saved ${target.displayName || target.email}.` };
}

/** Record a period of absence. */
export async function recordAbsence(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  const userId = str(formData, "userId");
  const startsOn = str(formData, "startsOn");
  const endsOn = str(formData, "endsOn");

  let actor;
  try {
    actor = await requireCapability("hr:manage", {
      entity: "absences",
      entityId: userId,
      action: "create",
      detail: "recorded an absence",
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  const start = parseDate(startsOn);
  const end = parseDate(endsOn);
  if (!start || !end) return { status: "error", message: "Give both a start and an end date." };
  if (end < start) return { status: "error", message: "The end date is before the start date." };

  await getDb().insert(absences).values({
    userId,
    type: (str(formData, "type") || "other") as "other",
    startsOn,
    endsOn,
    notes: orNull(formData, "notes"),
    recordedBy: actor.userId,
  });

  revalidatePath("/admin/hr");
  return { status: "ok", message: "Absence recorded." };
}

/** Record completed training, with its expiry where the certificate has one. */
export async function recordTraining(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  const userId = str(formData, "userId");
  const course = str(formData, "course");
  const completedOn = str(formData, "completedOn");

  try {
    await requireCapability("hr:manage", {
      entity: "training_records",
      entityId: userId,
      action: "create",
      detail: `recorded training: ${course}`,
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  if (!course) return { status: "error", message: "Name the course." };
  if (!parseDate(completedOn)) return { status: "error", message: "Give the completion date." };

  await getDb().insert(trainingRecords).values({
    userId,
    course,
    provider: orNull(formData, "provider"),
    completedOn,
    expiresOn: orNull(formData, "expiresOn"),
    certificateRef: orNull(formData, "certificateRef"),
  });

  revalidatePath("/admin/hr");
  return { status: "ok", message: `Recorded ${course}.` };
}
