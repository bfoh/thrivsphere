"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, availabilityExceptions, availabilityRules, packages } from "@/db/schema";
import { getCurrentActor } from "@/lib/session";
import { requireCapability } from "@/lib/guard";
import { recordAudit } from "@/lib/audit";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz";
import { getBookableSlots, getDefaultPractitioner } from "@/lib/queries/availability";
import { encryptSecret } from "@/lib/crypto";
import type { BookingState } from "@/lib/booking-state";

function str(fd: FormData, name: string) {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function guardMessage(err: unknown): BookingState | null {
  if (err instanceof UnauthenticatedError) {
    return { status: "error", message: "Your session has expired. Please sign in again." };
  }
  if (err instanceof ForbiddenError) {
    return { status: "error", message: "You do not have permission to do that." };
  }
  return null;
}

/**
 * Book a session.
 *
 * Draws a session from the client's package. The database holds an exclusion
 * constraint preventing two scheduled appointments overlapping for the same
 * practitioner, so a race between two clients choosing the same slot ends as a
 * constraint violation here rather than a double booking — hence the catch
 * around the insert rather than only a "is it free?" check beforehand.
 */
export async function bookAppointment(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const actor = await getCurrentActor();
  if (!actor) return { status: "error", message: "Please sign in to book." };
  if (!actor.clientId) return { status: "error", message: "Please finish registering first." };

  const startsAtRaw = str(formData, "startsAt");
  const durationMinutes = Number(str(formData, "durationMinutes") || 50);
  const startsAt = new Date(startsAtRaw);
  if (Number.isNaN(startsAt.getTime())) {
    return { status: "error", message: "That appointment time wasn't valid." };
  }
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

  const practitioner = await getDefaultPractitioner();
  if (!practitioner) {
    return { status: "error", message: "No practitioner is available to book with yet." };
  }

  const db = getDb();

  // The slot must still be one we actually offer — this stops a stale page or a
  // hand-crafted request booking outside the practitioner's hours.
  const slots = await getBookableSlots({
    practitionerId: practitioner.id,
    durationMinutes,
    days: 60,
  });
  if (!slots.some((s) => s.startsAt.getTime() === startsAt.getTime())) {
    return { status: "error", message: "That time is no longer available. Please choose another." };
  }

  // Spend a session from an active package, if there is one.
  const [pkg] = await db
    .select()
    .from(packages)
    .where(and(eq(packages.clientId, actor.clientId), eq(packages.status, "active")))
    .limit(1);

  const hasCredit = pkg && pkg.sessionsUsed < pkg.sessionsTotal;

  try {
    await db.insert(appointments).values({
      clientId: actor.clientId,
      practitionerId: practitioner.id,
      startsAt,
      endsAt,
      status: "scheduled",
      packageId: hasCredit ? pkg.id : null,
    });
  } catch (err) {
    console.error("[booking] insert failed", err);
    return {
      status: "error",
      message: "That time has just been taken. Please choose another slot.",
    };
  }

  if (hasCredit) {
    await db
      .update(packages)
      .set({ sessionsUsed: sql`${packages.sessionsUsed} + 1`, updatedAt: new Date() })
      .where(eq(packages.id, pkg.id));
  }

  await recordAudit({
    actorId: actor.userId,
    action: "create",
    entity: "appointments",
    subjectClientId: actor.clientId,
    detail: `booked ${startsAt.toISOString()}`,
  });

  revalidatePath("/portal");
  revalidatePath("/portal/book");
  return { status: "ok", message: "Your session is booked. The details are in your account." };
}

/** Mark an appointment completed, cancelled or a no-show. */
export async function setAppointmentStatus(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const id = str(formData, "appointmentId");
  const status = str(formData, "status") as
    | "completed"
    | "cancelled_by_client"
    | "cancelled_by_service"
    | "no_show";
  const reason = str(formData, "reason");

  const allowed = ["completed", "cancelled_by_client", "cancelled_by_service", "no_show"];
  if (!id || !allowed.includes(status)) {
    return { status: "error", message: "That wasn't a valid change." };
  }

  try {
    await requireCapability("appointment:manage:any", {
      entity: "appointments",
      entityId: id,
      action: "update",
      detail: `set status to ${status}`,
    });
  } catch (err) {
    const mapped = guardMessage(err);
    if (mapped) return mapped;
    throw err;
  }

  const db = getDb();
  const isCancellation = status.startsWith("cancelled");

  await db
    .update(appointments)
    .set({
      status,
      cancelledAt: isCancellation ? new Date() : null,
      cancellationReason: isCancellation ? reason || null : null,
      attendedAt: status === "completed" ? new Date() : null,
      // A no-show consumes the session; a cancellation returns it below.
      chargedToPackage: status === "no_show",
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, id));

  // A cancelled session that had been charged is returned to the package.
  if (isCancellation) {
    const [appt] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    if (appt?.packageId) {
      await db
        .update(packages)
        .set({ sessionsUsed: sql`greatest(${packages.sessionsUsed} - 1, 0)`, updatedAt: new Date() })
        .where(eq(packages.id, appt.packageId));
    }
  }

  revalidatePath("/admin/appointments");
  return { status: "ok", message: "Appointment updated." };
}

/**
 * Store the joining link for a session.
 *
 * Encrypted at rest and only ever rendered inside the authenticated portal.
 * It is never put in an email: for someone whose inbox may be monitored, a
 * joining link is a safety risk rather than a convenience.
 */
export async function setMeetingLink(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const id = str(formData, "appointmentId");
  const link = str(formData, "meetingLink");

  if (!id) return { status: "error", message: "Missing appointment." };
  if (link && !/^https:\/\/\S+$/i.test(link)) {
    return { status: "error", message: "Please paste a full https:// link." };
  }

  try {
    await requireCapability("appointment:manage:any", {
      entity: "appointments",
      entityId: id,
      action: "update",
      detail: "set meeting link",
    });
  } catch (err) {
    const mapped = guardMessage(err);
    if (mapped) return mapped;
    throw err;
  }

  await getDb()
    .update(appointments)
    .set({
      meetingLinkEncrypted: link ? encryptSecret(link) : null,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, id));

  revalidatePath("/admin/appointments");
  return { status: "ok", message: link ? "Joining link saved." : "Joining link removed." };
}

/** Add a weekly availability window. */
export async function addAvailabilityRule(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const dayOfWeek = Number(str(formData, "dayOfWeek"));
  const startTime = str(formData, "startTime");
  const endTime = str(formData, "endTime");

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return { status: "error", message: "Please choose a day." };
  }
  if (!startTime || !endTime || endTime <= startTime) {
    return { status: "error", message: "The end time must be after the start time." };
  }

  let actor;
  try {
    actor = await requireCapability("availability:manage", {
      entity: "availability_rules",
      action: "create",
      detail: `added availability: day ${dayOfWeek} ${startTime}-${endTime}`,
    });
  } catch (err) {
    const mapped = guardMessage(err);
    if (mapped) return mapped;
    throw err;
  }

  await getDb().insert(availabilityRules).values({
    practitionerId: actor.userId,
    dayOfWeek,
    startTime,
    endTime,
    timezone: "Europe/London",
  });

  revalidatePath("/admin/availability");
  return { status: "ok", message: "Availability added." };
}

export async function removeAvailabilityRule(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const id = str(formData, "ruleId");
  if (!id) return { status: "error", message: "Missing rule." };

  try {
    await requireCapability("availability:manage", {
      entity: "availability_rules",
      entityId: id,
      action: "delete",
      detail: "removed an availability window",
    });
  } catch (err) {
    const mapped = guardMessage(err);
    if (mapped) return mapped;
    throw err;
  }

  await getDb().delete(availabilityRules).where(eq(availabilityRules.id, id));
  revalidatePath("/admin/availability");
  return { status: "ok", message: "Availability removed." };
}

/** Block a date, or part of one. */
export async function addAvailabilityException(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const date = str(formData, "date");
  const reason = str(formData, "reason");
  const startTime = str(formData, "startTime");
  const endTime = str(formData, "endTime");

  if (!date) return { status: "error", message: "Please choose a date." };
  if (startTime && endTime && endTime <= startTime) {
    return { status: "error", message: "The end time must be after the start time." };
  }

  let actor;
  try {
    actor = await requireCapability("availability:manage", {
      entity: "availability_exceptions",
      action: "create",
      detail: `blocked ${date}`,
    });
  } catch (err) {
    const mapped = guardMessage(err);
    if (mapped) return mapped;
    throw err;
  }

  await getDb().insert(availabilityExceptions).values({
    practitionerId: actor.userId,
    date,
    blocked: true,
    startTime: startTime || null,
    endTime: endTime || null,
    reason: reason || null,
  });

  revalidatePath("/admin/availability");
  return { status: "ok", message: "Time blocked." };
}
