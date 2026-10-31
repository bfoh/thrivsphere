"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appointments,
  availabilityExceptions,
  availabilityRules,
  practitionerSettings,
  users,
} from "@/db/schema";
import { getCurrentActor } from "@/lib/session";
import { requireCapability } from "@/lib/guard";
import { recordAudit } from "@/lib/audit";
import { ForbiddenError, STAFF_ROLES, UnauthenticatedError } from "@/lib/authz";
import { encryptSecret } from "@/lib/crypto";
import { isOverlapViolation } from "@/lib/allocation";
import {
  bookingRequiresPayment,
  notifyClient,
  notifyPractitioner,
  placeBooking,
  releaseSession,
  reserveSession,
} from "@/lib/booking-engine";
import { appointmentCancelled, bookingConfirmation } from "@/lib/email-templates";
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
    // Defaults to "You do not have permission to do that."
    return { status: "error", message: err.message };
  }
  return null;
}

function revalidateDiaries() {
  revalidatePath("/admin/appointments");
  revalidatePath("/admin/availability");
  revalidatePath("/portal");
  revalidatePath("/portal/appointments");
  revalidatePath("/portal/book");
}

/**
 * Book a session.
 *
 * The client picks a time; the service picks who takes it (see
 * `placeBooking`). A session is taken from the client's package first and
 * given back if the booking cannot be placed. The database's no-overlap rule
 * is the final word on double booking, so a race between two clients ends in
 * a refusal rather than two people in one session.
 */
export async function bookAppointment(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const actor = await getCurrentActor();
  if (!actor) return { status: "error", message: "Please sign in to book." };
  if (!actor.clientId) return { status: "error", message: "Please finish registering first." };
  const clientId = actor.clientId;

  const startsAt = new Date(str(formData, "startsAt"));
  if (Number.isNaN(startsAt.getTime())) {
    return { status: "error", message: "That appointment time wasn't valid." };
  }

  const now = new Date();
  const packageId = await reserveSession(clientId, now);
  if (!packageId && bookingRequiresPayment()) {
    return {
      status: "error",
      message: "Please buy a session before booking — you can do that under Buy sessions.",
    };
  }

  const placed = await placeBooking({ clientId, startsAt, packageId, now });
  if (!placed.ok) {
    if (packageId) await releaseSession(packageId);
    return { status: "error", message: placed.message };
  }

  await recordAudit({
    actorId: actor.userId,
    action: "create",
    entity: "appointments",
    entityId: placed.appointmentId,
    subjectClientId: clientId,
    detail: `booked ${startsAt.toISOString()}${packageId ? "" : " (no prepaid session)"}`,
  });

  await Promise.all([
    notifyClient(placed.appointmentId, clientId, bookingConfirmation(startsAt), "booking_confirmation"),
    notifyPractitioner(placed.practitionerId, "booked", startsAt),
  ]);

  revalidateDiaries();
  return {
    status: "ok",
    message: "Your session is booked. You'll find it, with your joining link, under Appointments.",
  };
}

/**
 * Close an appointment: completed, cancelled or a no-show.
 *
 * Only a still-booked appointment can change, and it changes once. That is
 * what stops a session being handed back to a package twice by pressing
 * Cancel twice, or by cancelling something already marked completed.
 */
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

  const isCancellation = status.startsWith("cancelled");
  const now = new Date();

  const [appt] = await getDb()
    .update(appointments)
    .set({
      status,
      cancelledAt: isCancellation ? now : null,
      cancellationReason: isCancellation ? reason || null : null,
      attendedAt: status === "completed" ? now : null,
      // A no-show uses the session; a cancellation gives it back below.
      chargedToPackage: status === "no_show",
      updatedAt: now,
    })
    .where(and(eq(appointments.id, id), eq(appointments.status, "scheduled")))
    .returning();

  if (!appt) return { status: "error", message: "This appointment has already been closed." };

  if (isCancellation) {
    if (appt.packageId) await releaseSession(appt.packageId);
    if (appt.startsAt > now) {
      await notifyClient(
        appt.id,
        appt.clientId,
        appointmentCancelled(appt.startsAt, { by: status === "cancelled_by_service" ? "service" : "client" }),
        "cancellation"
      );
    }
  }

  revalidateDiaries();
  return { status: "ok", message: "Appointment updated." };
}

/**
 * Give a booked session to a different practitioner.
 *
 * If the new practitioner already has a session at that time the database
 * refuses, and the screen says so. A joining link that was only the old
 * practitioner's default room follows the session to the new one's room; a
 * link someone set by hand is left alone.
 */
export async function reassignAppointment(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const id = str(formData, "appointmentId");
  const practitionerId = str(formData, "practitionerId");
  if (!id || !practitionerId) return { status: "error", message: "Choose a practitioner." };

  try {
    await requireCapability("appointment:manage:any", {
      entity: "appointments",
      entityId: id,
      action: "update",
      detail: `reassigned to ${practitionerId}`,
    });
  } catch (err) {
    const mapped = guardMessage(err);
    if (mapped) return mapped;
    throw err;
  }

  const db = getDb();
  const [[appt], [target]] = await Promise.all([
    db.select().from(appointments).where(eq(appointments.id, id)).limit(1),
    db
      .select({ id: users.id, name: users.displayName, email: users.email })
      .from(users)
      .where(and(eq(users.id, practitionerId), inArray(users.role, STAFF_ROLES), eq(users.status, "active")))
      .limit(1),
  ]);
  if (!appt || appt.status !== "scheduled") {
    return { status: "error", message: "Only a booked appointment can be reassigned." };
  }
  if (!target) return { status: "error", message: "That person can't take appointments." };
  if (appt.practitionerId === target.id) return { status: "ok", message: "Already with them." };

  const settings = await db
    .select()
    .from(practitionerSettings)
    .where(inArray(practitionerSettings.userId, [appt.practitionerId, target.id]));
  const oldDefault = settings.find((s) => s.userId === appt.practitionerId)?.defaultMeetingLinkEncrypted ?? null;
  const newDefault = settings.find((s) => s.userId === target.id)?.defaultMeetingLinkEncrypted ?? null;
  const followRoom = !appt.meetingLinkEncrypted || appt.meetingLinkEncrypted === oldDefault;

  try {
    await db
      .update(appointments)
      .set({
        practitionerId: target.id,
        meetingLinkEncrypted: followRoom ? newDefault : appt.meetingLinkEncrypted,
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.id, id), eq(appointments.status, "scheduled")));
  } catch (err) {
    if (isOverlapViolation(err)) {
      return { status: "error", message: `${target.name || target.email} already has a session at that time.` };
    }
    throw err;
  }

  await notifyPractitioner(target.id, "assigned", appt.startsAt);

  revalidateDiaries();
  return {
    status: "ok",
    message: followRoom && !newDefault
      ? "Reassigned. They have no default meeting room yet, so add a joining link."
      : "Reassigned.",
  };
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

  revalidateDiaries();
  return { status: "ok", message: link ? "Joining link saved." : "Joining link removed." };
}

/* ------------------------------------------------------------ availability */

type AvailabilityAudit = { entity: string; entityId?: string; action: "create" | "update" | "delete"; detail: string };

/**
 * Whose calendar an availability change is for.
 *
 * A practitioner manages their own. Changing someone else's needs
 * `availability:manage:any`, and is audited as such — that is how the owner
 * allocates hours across the team without everyone being able to edit
 * everyone else's diary.
 */
async function calendarOwner(requested: string, audit: AvailabilityAudit): Promise<string> {
  const actor = await requireCapability("availability:manage", audit);
  if (!requested || requested === actor.userId) return actor.userId;

  await requireCapability("availability:manage:any", { ...audit, detail: `${audit.detail} (for ${requested})` });
  const [staff] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, requested), inArray(users.role, STAFF_ROLES), eq(users.status, "active")))
    .limit(1);
  if (!staff) throw new ForbiddenError("That person can't take appointments.");
  return staff.id;
}

/** Run a guard, turning a refusal into a message for the form. */
async function guarded<T>(fn: () => Promise<T>): Promise<T | BookingState> {
  try {
    return await fn();
  } catch (err) {
    const mapped = guardMessage(err);
    if (mapped) return mapped;
    throw err;
  }
}

function isState(v: unknown): v is BookingState {
  return !!v && typeof v === "object" && "status" in v && "message" in v;
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

  const owner = await guarded(() =>
    calendarOwner(str(formData, "practitionerId"), {
      entity: "availability_rules",
      action: "create",
      detail: `added availability: day ${dayOfWeek} ${startTime}-${endTime}`,
    })
  );
  if (isState(owner)) return owner;

  await getDb().insert(availabilityRules).values({
    practitionerId: owner,
    dayOfWeek,
    startTime,
    endTime,
    timezone: "Europe/London",
  });

  revalidateDiaries();
  return { status: "ok", message: "Availability added." };
}

export async function removeAvailabilityRule(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const id = str(formData, "ruleId");
  if (!id) return { status: "error", message: "Missing rule." };

  const [rule] = await getDb().select().from(availabilityRules).where(eq(availabilityRules.id, id)).limit(1);
  if (!rule) return { status: "error", message: "That window has already gone." };

  const owner = await guarded(() =>
    calendarOwner(rule.practitionerId, {
      entity: "availability_rules",
      entityId: id,
      action: "delete",
      detail: "removed an availability window",
    })
  );
  if (isState(owner)) return owner;

  await getDb()
    .delete(availabilityRules)
    .where(and(eq(availabilityRules.id, id), eq(availabilityRules.practitionerId, owner)));
  revalidateDiaries();
  return { status: "ok", message: "Availability removed." };
}

/**
 * Block a date or part of one, or open extra hours on a date.
 *
 * `kind=open` adds hours outside the weekly pattern ("add more appointment
 * days and times"); anything else blocks time.
 */
export async function addAvailabilityException(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const open = str(formData, "kind") === "open";
  const date = str(formData, "date");
  const reason = str(formData, "reason");
  const startTime = str(formData, "startTime");
  const endTime = str(formData, "endTime");

  if (!date) return { status: "error", message: "Please choose a date." };
  if (open && (!startTime || !endTime)) {
    return { status: "error", message: "Please give the hours you're opening." };
  }
  if (startTime && endTime && endTime <= startTime) {
    return { status: "error", message: "The end time must be after the start time." };
  }

  const owner = await guarded(() =>
    calendarOwner(str(formData, "practitionerId"), {
      entity: "availability_exceptions",
      action: "create",
      detail: open ? `opened ${date} ${startTime}-${endTime}` : `blocked ${date}`,
    })
  );
  if (isState(owner)) return owner;

  await getDb().insert(availabilityExceptions).values({
    practitionerId: owner,
    date,
    blocked: !open,
    startTime: startTime || null,
    endTime: endTime || null,
    reason: reason || null,
  });

  revalidateDiaries();
  return { status: "ok", message: open ? "Extra hours opened." : "Time blocked." };
}

export async function removeAvailabilityException(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const id = str(formData, "exceptionId");
  if (!id) return { status: "error", message: "Missing entry." };

  const [entry] = await getDb()
    .select()
    .from(availabilityExceptions)
    .where(eq(availabilityExceptions.id, id))
    .limit(1);
  if (!entry) return { status: "error", message: "That entry has already gone." };

  const owner = await guarded(() =>
    calendarOwner(entry.practitionerId, {
      entity: "availability_exceptions",
      entityId: id,
      action: "delete",
      detail: `removed ${entry.blocked ? "blocked time" : "extra hours"} on ${entry.date}`,
    })
  );
  if (isState(owner)) return owner;

  await getDb()
    .delete(availabilityExceptions)
    .where(and(eq(availabilityExceptions.id, id), eq(availabilityExceptions.practitionerId, owner)));
  revalidateDiaries();
  return { status: "ok", message: "Removed." };
}

/**
 * A practitioner's default meeting room.
 *
 * Copied onto every new booking with them, and onto any of their upcoming
 * sessions that have no link yet, so clients always find a joining link in
 * their account. Encrypted like every other joining link.
 */
export async function setDefaultMeetingLink(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const link = str(formData, "meetingLink");
  if (link && !/^https:\/\/\S+$/i.test(link)) {
    return { status: "error", message: "Please paste a full https:// link." };
  }

  const owner = await guarded(() =>
    calendarOwner(str(formData, "practitionerId"), {
      entity: "practitioner_settings",
      action: "update",
      detail: link ? "set default meeting room" : "removed default meeting room",
    })
  );
  if (isState(owner)) return owner;

  const db = getDb();
  const encrypted = link ? encryptSecret(link) : null;
  const now = new Date();

  await db
    .insert(practitionerSettings)
    .values({ userId: owner, defaultMeetingLinkEncrypted: encrypted, updatedAt: now })
    .onConflictDoUpdate({
      target: practitionerSettings.userId,
      set: { defaultMeetingLinkEncrypted: encrypted, updatedAt: now },
    });

  let filled = 0;
  if (encrypted) {
    const rows = await db
      .update(appointments)
      .set({ meetingLinkEncrypted: encrypted, updatedAt: now })
      .where(
        and(
          eq(appointments.practitionerId, owner),
          eq(appointments.status, "scheduled"),
          gte(appointments.startsAt, now),
          isNull(appointments.meetingLinkEncrypted)
        )
      )
      .returning({ id: appointments.id });
    filled = rows.length;
  }

  revalidateDiaries();
  return {
    status: "ok",
    message: link
      ? `Default meeting room saved${filled ? `, and added to ${filled} upcoming session${filled === 1 ? "" : "s"}` : ""}.`
      : "Default meeting room removed.",
  };
}
