import "server-only";

import { and, count, desc, eq, gte, inArray, isNotNull, lt, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appointments,
  clients,
  orders,
  packages,
  practitionerSettings,
  pricePlans,
  remindersSent,
  users,
} from "@/db/schema";
import {
  REVIEW_PLAN_SLUG,
  isOverlapViolation,
  rankPractitioners,
  selectPackage,
  type BookingKind,
} from "./allocation";
import { getPooledSlots } from "./queries/availability";
import { expireCheckoutSession, retrieveCheckoutSession } from "./stripe";
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

/** A client's packages, each marked with whether it was bought as the review. */
export async function getClientCredits(clientId: string) {
  const rows = await getDb()
    .select({ pkg: packages, planSlug: pricePlans.slug })
    .from(packages)
    .leftJoin(orders, eq(orders.id, packages.orderId))
    .leftJoin(pricePlans, eq(pricePlans.id, orders.pricePlanId))
    .where(eq(packages.clientId, clientId));
  return rows.map((r) => ({ ...r.pkg, forReview: r.planSlug === REVIEW_PLAN_SLUG }));
}

/**
 * What the client's next booking is. Their first appointment that went ahead
 * or is still booked is the review (see `appointmentKinds`), so a cancelled
 * one leaves the review still to book.
 */
export async function nextBookingKind(clientId: string): Promise<BookingKind> {
  const [live] = await getDb()
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(eq(appointments.clientId, clientId), inArray(appointments.status, ["scheduled", "completed", "no_show"]))
    )
    .limit(1);
  return live ? "session" : "review";
}

/**
 * Take one session from the client's best package for this kind of booking.
 *
 * The update re-checks the balance in SQL, so two bookings racing for a
 * package's last session cannot both have it. Returns the package used, or
 * null if the client has no credit that can pay for it.
 */
export async function reserveSession(
  clientId: string,
  booking: BookingKind,
  now: Date = new Date()
): Promise<string | null> {
  const db = getDb();
  const owned = await getClientCredits(clientId);
  const chosen = selectPackage(owned, booking, now);
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
 * tried, so the client only sees "taken" when nobody is left. A client who
 * chose a practitioner (§19) is booked with them or not at all.
 *
 * With `hold`, the time is held while the client pays rather than booked: it
 * blocks the slot for everyone else, and becomes a booking only when Stripe
 * confirms payment (`confirmHold`).
 */
export async function placeBooking({
  clientId,
  startsAt,
  packageId,
  preferPractitionerId,
  onlyPractitionerId,
  excludeAppointmentId,
  hold,
  now = new Date(),
}: {
  clientId: string;
  startsAt: Date;
  packageId: string | null;
  preferPractitionerId?: string | null;
  /** The practitioner the client chose. */
  onlyPractitionerId?: string | null;
  excludeAppointmentId?: string;
  hold?: { orderId: string; expiresAt: Date };
  now?: Date;
}): Promise<PlaceResult> {
  const db = getDb();

  // A few days beyond what the booking page shows, so a page left open
  // overnight still validates.
  const offered = await getPooledSlots({ clientId, days: 35, excludeAppointmentId, now });
  const slot = offered.find((s) => s.startsAt.getTime() === startsAt.getTime());
  if (!slot) return { ok: false, message: "That time is no longer available. Please choose another." };
  if (onlyPractitionerId && !slot.practitionerIds.includes(onlyPractitionerId)) {
    return { ok: false, message: "That practitioner is no longer free at that time. Please choose another." };
  }
  const candidates = onlyPractitionerId ? [onlyPractitionerId] : slot.practitionerIds;

  const [load, previous, settings] = await Promise.all([
    db
      .select({ practitionerId: appointments.practitionerId, n: count() })
      .from(appointments)
      .where(
        and(
          eq(appointments.status, "scheduled"),
          gte(appointments.startsAt, now),
          inArray(appointments.practitionerId, candidates)
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
      .where(inArray(practitionerSettings.userId, candidates)),
  ]);

  const order = rankPractitioners({
    candidates,
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
          status: hold ? "pending_payment" : "scheduled",
          packageId,
          orderId: hold?.orderId ?? null,
          holdExpiresAt: hold?.expiresAt ?? null,
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

/* ------------------------------------------------------------ paid holds */

/**
 * Let go of a client's earlier unpaid times before they choose another.
 *
 * Each checkout is closed at Stripe first, so the old time can no longer be
 * paid for once it is released. A checkout Stripe says is complete was paid
 * after all: that hold is kept for the webhook to confirm.
 */
export async function releaseClientHolds(clientId: string): Promise<void> {
  const db = getDb();
  const holds = await db
    .select({ id: appointments.id, orderId: appointments.orderId, checkoutSessionId: orders.checkoutSessionId, orderStatus: orders.status })
    .from(appointments)
    .leftJoin(orders, eq(orders.id, appointments.orderId))
    .where(and(eq(appointments.clientId, clientId), eq(appointments.status, "pending_payment")));

  for (const h of holds) {
    if (h.orderStatus === "paid") continue;
    if (h.checkoutSessionId) {
      try {
        await expireCheckoutSession(h.checkoutSessionId);
      } catch {
        // Refused because it had already expired (fine) or been paid (keep it).
        const current = await retrieveCheckoutSession(h.checkoutSessionId).catch(() => null);
        if (!current || current.status !== "expired") continue;
      }
    }
    await db.delete(appointments).where(and(eq(appointments.id, h.id), eq(appointments.status, "pending_payment")));
    if (h.orderId) {
      await db.update(orders).set({ status: "cancelled" }).where(and(eq(orders.id, h.orderId), eq(orders.status, "pending")));
    }
  }
}

/** Release the time held for a payment that will not complete. */
export async function releaseHold(orderId: string): Promise<number> {
  const released = await getDb()
    .delete(appointments)
    .where(and(eq(appointments.orderId, orderId), eq(appointments.status, "pending_payment")))
    .returning({ id: appointments.id });
  return released.length;
}

/**
 * Release holds whose checkout has long expired, in case Stripe's "expired"
 * event never arrived. A hold whose order was paid is never swept: the
 * webhook confirms it.
 */
export async function sweepExpiredHolds(now: Date = new Date()): Promise<number> {
  const db = getDb();
  const stale = await db
    .select({ id: appointments.id })
    .from(appointments)
    .leftJoin(orders, eq(orders.id, appointments.orderId))
    .where(
      and(
        eq(appointments.status, "pending_payment"),
        isNotNull(appointments.holdExpiresAt),
        lt(appointments.holdExpiresAt, now),
        sql`(${orders.status} is null or ${orders.status} <> 'paid')`
      )
    );
  if (stale.length === 0) return 0;
  const released = await db
    .delete(appointments)
    .where(and(inArray(appointments.id, stale.map((r) => r.id)), eq(appointments.status, "pending_payment")))
    .returning({ id: appointments.id });
  return released.length;
}

export type ConfirmedHold = { appointmentId: string; practitionerId: string; startsAt: Date };

/**
 * Turn a paid-for hold into a booking, paid by the package that payment
 * created.
 *
 * Both writes run in one transaction, and each is conditional, so a webhook
 * delivered twice or retried after a failure books once and spends the
 * session once. Returns the booking only to the call that made it, so
 * confirmation emails go out once; null means there was no hold to confirm.
 */
export async function confirmHold(orderId: string, packageId: string, now: Date = new Date()): Promise<ConfirmedHold | null> {
  const db = getDb();
  const [confirmed] = await db.batch([
    db
      .update(appointments)
      .set({ status: "scheduled", packageId, holdExpiresAt: null, updatedAt: now })
      .where(and(eq(appointments.orderId, orderId), eq(appointments.status, "pending_payment")))
      .returning({ appointmentId: appointments.id, practitionerId: appointments.practitionerId, startsAt: appointments.startsAt }),
    db
      .update(packages)
      .set({
        sessionsUsed: sql`${packages.sessionsUsed} + 1`,
        status: sql`case when ${packages.sessionsUsed} + 1 >= ${packages.sessionsTotal} then 'exhausted'::package_status else ${packages.status} end`,
        updatedAt: now,
      })
      .where(
        and(
          eq(packages.id, packageId),
          sql`${packages.sessionsUsed} < ${packages.sessionsTotal}`,
          sql`exists (select 1 from ${appointments} where ${appointments.packageId} = ${packageId} and ${appointments.orderId} = ${orderId} and ${appointments.status} = 'scheduled')`
        )
      ),
  ]);
  return confirmed[0] ?? null;
}

/** Whether the payment's booking is already confirmed: a repeat of a settled event. */
export async function holdAlreadyConfirmed(orderId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.orderId, orderId), ne(appointments.status, "pending_payment")))
    .limit(1);
  return !!row;
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
