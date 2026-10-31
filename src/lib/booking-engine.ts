import "server-only";

import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, clients, packages, practitionerSettings, remindersSent, users } from "@/db/schema";
import { isOverlapViolation, rankPractitioners, selectPackage } from "./allocation";
import { getPooledSlots } from "./queries/availability";
import { sendEmail } from "./email";
import { staffAppointmentNotice, type Email } from "./email-templates";

/**
 * Placing, paying for and announcing bookings.
 *
 * Shared by the client's own booking and rescheduling and by the back office,
 * so the rules about who takes a session and what pays for it live in one
 * place. The decisions themselves are pure functions in ./allocation.
 */

/**
 * Whether a client must hold a paid session before booking.
 *
 * Off until the owner decides; with it off a client can book and pay
 * afterwards, which is how the service has run so far.
 */
export function bookingRequiresPayment(): boolean {
  return process.env.BOOKING_REQUIRES_PAYMENT === "true";
}

/**
 * Take one session from the client's best package.
 *
 * The update re-checks the balance in SQL, so two bookings racing for a
 * package's last session cannot both have it. Returns the package used, or
 * null if the client has no credit.
 */
export async function reserveSession(clientId: string, now: Date = new Date()): Promise<string | null> {
  const db = getDb();
  const owned = await db.select().from(packages).where(eq(packages.clientId, clientId));
  const chosen = selectPackage(owned, now);
  if (!chosen) return null;

  const [taken] = await db
    .update(packages)
    .set({
      sessionsUsed: sql`${packages.sessionsUsed} + 1`,
      status: sql`case when ${packages.sessionsUsed} + 1 >= ${packages.sessionsTotal} then 'exhausted'::package_status else ${packages.status} end`,
      updatedAt: now,
    })
    .where(
      and(
        eq(packages.id, chosen.id),
        eq(packages.status, "active"),
        sql`${packages.sessionsUsed} < ${packages.sessionsTotal}`
      )
    )
    .returning({ id: packages.id });

  return taken?.id ?? null;
}

/** Give a session back, reopening the package if that was its last one. */
export async function releaseSession(packageId: string): Promise<void> {
  await getDb()
    .update(packages)
    .set({
      sessionsUsed: sql`greatest(${packages.sessionsUsed} - 1, 0)`,
      status: sql`case when ${packages.status} = 'exhausted' then 'active'::package_status else ${packages.status} end`,
      updatedAt: new Date(),
    })
    .where(eq(packages.id, packageId));
}

export type PlaceResult =
  | { ok: true; appointmentId: string; practitionerId: string }
  | { ok: false; message: string };

/**
 * Book a time for a client with whichever practitioner should take it.
 *
 * The time must be one currently offered to this client. Practitioners free
 * then are tried in order (see `rankPractitioners`); if the database's
 * no-overlap rule refuses one because the slot has just gone, the next is
 * tried, so the client only sees "taken" when nobody is left.
 */
export async function placeBooking({
  clientId,
  startsAt,
  packageId,
  preferPractitionerId,
  excludeAppointmentId,
  now = new Date(),
}: {
  clientId: string;
  startsAt: Date;
  packageId: string | null;
  preferPractitionerId?: string | null;
  excludeAppointmentId?: string;
  now?: Date;
}): Promise<PlaceResult> {
  const db = getDb();

  // A few days beyond what the booking page shows, so a page left open
  // overnight still validates.
  const offered = await getPooledSlots({ clientId, days: 35, excludeAppointmentId, now });
  const slot = offered.find((s) => s.startsAt.getTime() === startsAt.getTime());
  if (!slot) return { ok: false, message: "That time is no longer available. Please choose another." };

  const [load, previous, settings] = await Promise.all([
    db
      .select({ practitionerId: appointments.practitionerId, n: count() })
      .from(appointments)
      .where(
        and(
          eq(appointments.status, "scheduled"),
          gte(appointments.startsAt, now),
          inArray(appointments.practitionerId, slot.practitionerIds)
        )
      )
      .groupBy(appointments.practitionerId),
    preferPractitionerId
      ? Promise.resolve([{ practitionerId: preferPractitionerId }])
      : db
          .select({ practitionerId: appointments.practitionerId })
          .from(appointments)
          .where(
            and(
              eq(appointments.clientId, clientId),
              inArray(appointments.status, ["scheduled", "completed", "no_show"])
            )
          )
          .orderBy(desc(appointments.startsAt))
          .limit(1),
    db
      .select()
      .from(practitionerSettings)
      .where(inArray(practitionerSettings.userId, slot.practitionerIds)),
  ]);

  const order = rankPractitioners({
    candidates: slot.practitionerIds,
    previousPractitionerId: previous[0]?.practitionerId,
    upcomingLoad: Object.fromEntries(load.map((r) => [r.practitionerId, Number(r.n)])),
  });
  const defaultLink = new Map(settings.map((s) => [s.userId, s.defaultMeetingLinkEncrypted]));

  for (const practitionerId of order) {
    try {
      const [row] = await db
        .insert(appointments)
        .values({
          clientId,
          practitionerId,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          status: "scheduled",
          packageId,
          // Already encrypted; copied as is so the client has a joining link
          // from the moment they book.
          meetingLinkEncrypted: defaultLink.get(practitionerId) ?? null,
        })
        .returning({ id: appointments.id });
      return { ok: true, appointmentId: row.id, practitionerId };
    } catch (err) {
      if (isOverlapViolation(err)) continue;
      console.error("[booking] insert failed", err);
      return { ok: false, message: "Something went wrong saving your booking. Please try again." };
    }
  }

  return { ok: false, message: "That time has just been taken. Please choose another." };
}

/**
 * Email a client about one of their appointments.
 *
 * Honours their choice to turn appointment emails off — for someone whose
 * inbox is read by another person that choice is a safety measure. When `kind`
 * is given the send is recorded, so the reminder job never repeats it, and a
 * failed send is left for that job to retry.
 */
export async function notifyClient(
  appointmentId: string,
  clientId: string,
  email: Email,
  kind?: "booking_confirmation" | "cancellation"
): Promise<void> {
  const db = getDb();
  const [client] = await db
    .select({ email: clients.email, emailRemindersEnabled: clients.emailRemindersEnabled })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client?.emailRemindersEnabled) return;

  const result = await sendEmail({ to: client.email, subject: email.subject, text: email.text, html: email.html });
  if (!result.ok) {
    console.error("[booking] client email failed", kind ?? "notice", result.reason);
    return;
  }
  if (kind) await db.insert(remindersSent).values({ appointmentId, kind });
}

/** Tell a practitioner their diary changed. Time only — no client details. */
export async function notifyPractitioner(
  practitionerId: string,
  change: Parameters<typeof staffAppointmentNotice>[0],
  startsAt: Date
): Promise<void> {
  const [practitioner] = await getDb()
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, practitionerId))
    .limit(1);
  if (!practitioner) return;

  const email = staffAppointmentNotice(change, startsAt);
  const result = await sendEmail({
    to: practitioner.email,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
  if (!result.ok) console.error("[booking] practitioner email failed", change, result.reason);
}
