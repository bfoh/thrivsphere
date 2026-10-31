"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments } from "@/db/schema";
import { getCurrentActor } from "@/lib/session";
import { requireClientAccess } from "@/lib/guard";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz";
import { RESCHEDULED_REASON, canReschedule, cancellationOutcome } from "@/lib/allocation";
import { notifyClient, notifyPractitioner, placeBooking, releaseSession } from "@/lib/booking-engine";
import { appointmentMoved } from "@/lib/email-templates";
import type { BookingState } from "@/lib/booking-state";

/**
 * A client cancelling or moving their own appointment (checklist §7).
 *
 * Both follow the Cancellation and Refund Policy: with 24 hours' notice or more
 * a cancelled session goes back to the client's package; with less it counts
 * as used. Moving a session keeps it, so it needs the full notice.
 */

function str(fd: FormData, name: string) {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Load an appointment and confirm it belongs to the person asking. */
async function ownAppointment(id: string, detail: string) {
  const actor = await getCurrentActor();
  if (!actor?.clientId) return { ok: false, error: "Please sign in to manage your appointments." } as const;
  if (!UUID.test(id)) return { ok: false, error: "We couldn't find that appointment." } as const;

  const [appt] = await getDb().select().from(appointments).where(eq(appointments.id, id)).limit(1);
  if (!appt) return { ok: false, error: "We couldn't find that appointment." } as const;

  try {
    // Audited, and refuses anyone but the client the appointment belongs to.
    await requireClientAccess(appt.clientId, { entity: "appointments", entityId: id, action: "update", detail });
  } catch (err) {
    if (err instanceof UnauthenticatedError || err instanceof ForbiddenError) {
      return { ok: false, error: "We couldn't find that appointment." } as const;
    }
    throw err;
  }
  if (appt.clientId !== actor.clientId) return { ok: false, error: "We couldn't find that appointment." } as const;
  return { ok: true, appt } as const;
}

function revalidateAppointments() {
  revalidatePath("/portal");
  revalidatePath("/portal/appointments");
  revalidatePath("/portal/book");
  revalidatePath("/admin/appointments");
}

export async function cancelOwnAppointment(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const id = str(formData, "appointmentId");
  if (!id) return { status: "error", message: "Missing appointment." };

  const found = await ownAppointment(id, "cancelled own appointment");
  if (!found.ok) return { status: "error", message: found.error };
  const { appt } = found;

  const now = new Date();
  const outcome = cancellationOutcome({ startsAt: appt.startsAt, status: appt.status, now });
  if (!outcome.allowed) return { status: "error", message: outcome.reason };

  const [cancelled] = await getDb()
    .update(appointments)
    .set({
      status: "cancelled_by_client",
      cancelledAt: now,
      cancellationReason: outcome.late ? "Cancelled by client with less than 24 hours' notice" : "Cancelled by client",
      chargedToPackage: outcome.late && !!appt.packageId,
      updatedAt: now,
    })
    .where(and(eq(appointments.id, id), eq(appointments.status, "scheduled")))
    .returning({ id: appointments.id });
  if (!cancelled) return { status: "error", message: "This appointment is no longer booked." };

  if (outcome.returnsSession && appt.packageId) await releaseSession(appt.packageId);
  await notifyPractitioner(appt.practitionerId, "cancelled", appt.startsAt);

  revalidateAppointments();
  return {
    status: "ok",
    message: outcome.late
      ? "Your appointment is cancelled. As it was less than 24 hours away, the session counts as used."
      : appt.packageId
        ? "Your appointment is cancelled and the session is back in your account."
        : "Your appointment is cancelled.",
  };
}

/**
 * Move an appointment to a new time.
 *
 * The new time is booked first — with the same practitioner where they are
 * free — and only then is the old one released, so a client never ends up
 * with neither. The prepaid session moves with it.
 */
export async function rescheduleOwnAppointment(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const id = str(formData, "appointmentId");
  const startsAt = new Date(str(formData, "startsAt"));
  if (!id) return { status: "error", message: "Missing appointment." };
  if (Number.isNaN(startsAt.getTime())) return { status: "error", message: "Please choose a new time." };

  const found = await ownAppointment(id, "rescheduled own appointment");
  if (!found.ok) return { status: "error", message: found.error };
  const { appt } = found;

  const now = new Date();
  if (!canReschedule({ startsAt: appt.startsAt, status: appt.status, now })) {
    return {
      status: "error",
      message: "Appointments can be moved up to 24 hours beforehand. Please message us if you need help.",
    };
  }

  const placed = await placeBooking({
    clientId: appt.clientId,
    startsAt,
    packageId: appt.packageId,
    preferPractitionerId: appt.practitionerId,
    excludeAppointmentId: appt.id,
    now,
  });
  if (!placed.ok) return { status: "error", message: placed.message };

  await getDb()
    .update(appointments)
    .set({
      status: "cancelled_by_client",
      cancelledAt: now,
      cancellationReason: RESCHEDULED_REASON,
      // The session moved to the new booking; it is not used and not returned.
      chargedToPackage: false,
      updatedAt: now,
    })
    .where(and(eq(appointments.id, appt.id), eq(appointments.status, "scheduled")));

  const samePractitioner = placed.practitionerId === appt.practitionerId;
  await Promise.all([
    notifyClient(placed.appointmentId, appt.clientId, appointmentMoved(startsAt), "booking_confirmation"),
    samePractitioner
      ? notifyPractitioner(appt.practitionerId, "moved", startsAt)
      : Promise.all([
          notifyPractitioner(appt.practitionerId, "cancelled", appt.startsAt),
          notifyPractitioner(placed.practitionerId, "booked", startsAt),
        ]),
  ]);

  revalidateAppointments();
  return { status: "ok", message: "Your appointment has been moved." };
}
