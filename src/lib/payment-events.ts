import "server-only";

import { and, eq, gt, notInArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, clients, orders, packages } from "@/db/schema";
import { brand } from "@/data/site";
import { recordAudit } from "./audit";
import { sendEmail } from "./email";
import { bookingConfirmation, paidTimeUnavailable, paymentAlert, paymentReceipt } from "./email-templates";
import {
  confirmHold,
  holdAlreadyConfirmed,
  notifyClient,
  notifyPractitioner,
  placeBooking,
  releaseHold,
  type ConfirmedHold,
} from "./booking-engine";
import { formatAppointment } from "./slot-groups";
import { displayPrice } from "./money";
import { retrieveCheckoutSession } from "./stripe";
import {
  amountMatches,
  creditsAfterRefund,
  disputeKeepsHold,
  packageExpiry,
  packageStatusFor,
  parseBookingMetadata,
  parseCheckoutMetadata,
  shouldFulfil,
} from "./fulfilment";

/**
 * What each Stripe event does to orders and sessions.
 *
 * Called by the webhook once the signature has been checked. Each handler
 * answers Stripe: a 2xx when the event is dealt with or deliberately ignored,
 * anything else only when retrying the same event could help.
 *
 * A package whose payment is refunded or disputed has status `refunded`, so
 * none of its sessions can be booked. A dispute puts that on hold until it is
 * decided; a lost dispute or a full refund makes it final.
 */

export type CheckoutObject = {
  id?: string;
  payment_status?: string;
  amount_total?: number;
  payment_intent?: string | null;
  metadata?: Record<string, string>;
};

export type ChargeObject = {
  payment_intent?: string | null;
  amount_refunded?: number;
};

export type DisputeObject = {
  payment_intent?: string | null;
  amount?: number;
  status?: string;
  reason?: string;
  evidence_details?: { due_by?: number | null };
};

const sessionsText = (n: number) => (n === 1 ? "1 session" : `${n} sessions`);

/**
 * Credit the sessions a client has paid for, and confirm the booking the
 * payment was for, if it was made while booking (IT handover §19, Route A).
 *
 * Fulfilment happens here rather than on the success redirect, because a
 * client may close the browser the moment they pay. The redirect is only a
 * confirmation screen; this is what actually grants the sessions.
 *
 * Stripe delivers events at least once and may retry after a failure part
 * way through, so every step is safe to repeat: the order is claimed with a
 * conditional update, the package is unique per order, and the hold is
 * confirmed only while it is still a hold. A repeat finishes whatever an
 * earlier attempt left undone and changes nothing else. Emails go out only
 * from the step that actually made the change.
 */
export async function fulfilCheckout(eventId: string, eventType: string, session: CheckoutObject): Promise<Response> {
  const db = getDb();

  if (!shouldFulfil({ eventType, paymentStatus: session.payment_status, alreadyProcessed: false })) {
    // Acknowledged deliberately: retrying an event we will never act on only
    // produces noise in Stripe's dashboard.
    return new Response("Ignored", { status: 200 });
  }

  const parsed = parseCheckoutMetadata(session.metadata ?? {});
  if (!parsed.ok) {
    console.error("[stripe] unusable metadata:", parsed.reason);
    return new Response("Unusable metadata", { status: 400 });
  }

  const orderId = session.metadata?.orderId;
  if (!orderId) return new Response("Missing order reference", { status: 400 });

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return new Response("Unknown order", { status: 400 });
  // Refunded before this arrived: no sessions.
  if (order.status === "refunded") return new Response("Already settled", { status: 200 });

  // Checkout is created from our own catalogue, so this should always agree —
  // verifying it is what stops a stale or tampered session granting six
  // sessions for the price of one.
  if (!amountMatches(session.amount_total, order.amountPence)) {
    console.error("[stripe] amount mismatch", { charged: session.amount_total, expected: order.amountPence, orderId });
    await recordAudit({
      actorId: null,
      action: "permission_denied",
      entity: "orders",
      entityId: orderId,
      subjectClientId: order.clientId,
      detail: `payment amount mismatch: charged ${session.amount_total}, expected ${order.amountPence}`,
    });
    return new Response("Amount mismatch", { status: 400 });
  }

  if (order.status !== "paid") {
    await db
      .update(orders)
      .set({
        status: "paid",
        paidAt: new Date(),
        paymentIntentId: session.payment_intent ?? null,
        processedEventId: eventId,
      })
      .where(and(eq(orders.id, orderId), notInArray(orders.status, ["paid", "refunded"])));
  }

  const [created] = await db
    .insert(packages)
    .values({
      clientId: order.clientId,
      orderId: order.id,
      sessionsTotal: parsed.value.sessions,
      sessionsUsed: 0,
      status: "active",
      expiresAt: packageExpiry(parsed.value.validityDays),
    })
    .onConflictDoNothing({ target: packages.orderId })
    .returning();
  const pkg = created ?? (await db.select().from(packages).where(eq(packages.orderId, orderId)).limit(1))[0];
  if (!pkg) return new Response("Package not recorded", { status: 500 });

  if (created) {
    await recordAudit({
      actorId: null,
      action: "update",
      entity: "orders",
      entityId: orderId,
      subjectClientId: order.clientId,
      detail: `payment settled: ${parsed.value.planName}, ${parsed.value.sessions} session(s)`,
    });
  }

  // The booking this payment was for, if any.
  const booking = parseBookingMetadata(session.metadata ?? {});
  let booked: ConfirmedHold | null = null;
  let timeLost = false;
  if (booking) {
    booked = await confirmHold(orderId, pkg.id);
    if (!booked && created && !(await holdAlreadyConfirmed(orderId))) {
      // The hold was released before payment arrived. Book the same time if
      // it is still free; otherwise the client keeps the paid consultation.
      booked = await rebookPaidTime(order.clientId, orderId, pkg.id, booking);
      timeLost = !booked;
    }
  }

  /*
   * Receipt and confirmation.
   *
   * Sent after the sessions are credited, and deliberately after the point of
   * no return: if the mail fails, the client has still been given what they
   * paid for. A failed email must never fail the request, or Stripe would
   * retry an event that has already done its work.
   *
   * Receipts are not subject to the reminder opt-out. Someone who has paid is
   * entitled to a record of it. The booking confirmation is, like every
   * appointment email.
   */
  try {
    const [client] = await db
      .select({ email: clients.email })
      .from(clients)
      .where(eq(clients.id, order.clientId))
      .limit(1);

    if (created && client?.email) {
      const receipt = paymentReceipt(parsed.value.planName, order.amountPence, parsed.value.sessions, {
        forBooking: !!booking && !timeLost,
      });
      const sent = await sendEmail({ to: client.email, subject: receipt.subject, text: receipt.text, html: receipt.html });
      if (!sent.ok) console.error("[stripe] receipt not sent:", sent.reason, orderId);
    }

    if (booked) {
      await recordAudit({
        actorId: null,
        action: "create",
        entity: "appointments",
        entityId: booked.appointmentId,
        subjectClientId: order.clientId,
        detail: `booked and paid ${booked.startsAt.toISOString()}`,
      });
      await Promise.all([
        notifyClient(booked.appointmentId, order.clientId, bookingConfirmation(booked.startsAt), "booking_confirmation"),
        notifyPractitioner(booked.practitionerId, "booked", booked.startsAt),
      ]);
    }

    if (timeLost && booking) {
      if (client?.email) {
        const notice = paidTimeUnavailable();
        const sent = await sendEmail({ to: client.email, subject: notice.subject, text: notice.text, html: notice.html });
        if (!sent.ok) console.error("[stripe] time-lost notice not sent:", sent.reason, orderId);
      }
      await alertOwner(
        "A paid consultation needs a new time",
        [
          `A client paid for their Initial Wellbeing Consultation for ${formatAppointment(booking.startsAt)}, but that time was taken before the payment arrived.`,
          "They have been asked to choose another time. The consultation is paid for and in their account.",
        ],
        order.clientId
      );
    }
  } catch (err) {
    console.error("[stripe] fulfilment emails failed", orderId, err);
  }

  return new Response("Fulfilled", { status: 200 });
}

/** Book the time a payment was for when its hold had already been released. */
async function rebookPaidTime(
  clientId: string,
  orderId: string,
  packageId: string,
  booking: { startsAt: Date; practitionerId: string | null }
): Promise<ConfirmedHold | null> {
  const placed = await placeBooking({ clientId, startsAt: booking.startsAt, packageId, preferPractitionerId: booking.practitionerId });
  if (!placed.ok) return null;
  const db = getDb();
  await db.batch([
    db.update(appointments).set({ orderId }).where(eq(appointments.id, placed.appointmentId)),
    db
      .update(packages)
      .set({
        sessionsUsed: sql`${packages.sessionsUsed} + 1`,
        status: sql`case when ${packages.sessionsUsed} + 1 >= ${packages.sessionsTotal} then 'exhausted'::package_status else ${packages.status} end`,
        updatedAt: new Date(),
      })
      .where(and(eq(packages.id, packageId), sql`${packages.sessionsUsed} < ${packages.sessionsTotal}`)),
  ]);
  return { appointmentId: placed.appointmentId, practitionerId: placed.practitionerId, startsAt: booking.startsAt };
}

/**
 * Close a checkout that will never be paid: one left until Stripe expired it,
 * or a delayed payment that failed. Nothing was credited, so there is nothing
 * to take back; this keeps the order from sitting at "pending" for ever, and
 * releases any time held for it so someone else can book it.
 */
export async function closeCheckout(session: CheckoutObject, status: "failed" | "cancelled"): Promise<Response> {
  if (!session.id) return new Response("Missing session", { status: 400 });
  const db = getDb();

  const [closed] = await db
    .update(orders)
    .set({ status })
    .where(and(eq(orders.checkoutSessionId, session.id), eq(orders.status, "pending")))
    .returning({ id: orders.id, clientId: orders.clientId });

  // Also when the order was already closed, e.g. by the client choosing
  // another time: releasing a hold twice is harmless.
  const [order] = closed
    ? [closed]
    : await db.select({ id: orders.id, status: orders.status }).from(orders).where(eq(orders.checkoutSessionId, session.id)).limit(1);
  const released = order && !("status" in order && order.status === "paid") ? await releaseHold(order.id) : 0;

  if (closed && status === "failed") {
    await recordAudit({
      actorId: null,
      action: "update",
      entity: "orders",
      entityId: closed.id,
      subjectClientId: closed.clientId,
      detail: "delayed payment failed",
    });
  }
  return new Response(closed || released ? "Closed" : "Ignored", { status: 200 });
}

/**
 * A refund made in the Stripe Dashboard.
 *
 * The client keeps only the sessions the money left with ThriveSphere still
 * pays for (see `creditsAfterRefund`). Sessions already booked against the
 * removed credit are left in place and reported to the owner, who decides
 * whether to cancel them.
 */
export async function applyRefund(charge: ChargeObject): Promise<Response> {
  const found = await purchaseFor(charge.payment_intent);
  // Not a website purchase, such as an invoice paid by an employer.
  if (!found) return new Response("Ignored", { status: 200 });
  const { order, pkg } = found;

  const db = getDb();
  const now = new Date();
  const refunded = charge.amount_refunded ?? 0;
  const full = refunded >= order.amountPence;
  const orderStatus = full ? "refunded" : order.status;
  const refundReason = full
    ? "Refunded in Stripe"
    : `Partly refunded in Stripe: ${displayPrice(refunded)} of ${displayPrice(order.amountPence)}`;
  const orderChanged = orderStatus !== order.status || refundReason !== order.refundReason;

  if (orderChanged) {
    await db
      .update(orders)
      .set({ status: orderStatus, refundedAt: order.refundedAt ?? now, refundReason })
      .where(eq(orders.id, order.id));
  }

  // Refunded before its sessions were ever credited.
  if (!pkg) return new Response("Refund recorded", { status: 200 });

  // Worked out from what was bought, not from the package, which an earlier
  // partial refund may already have reduced.
  const sessions = (await sessionsBought(order.checkoutSessionId)) ?? pkg.sessionsTotal;
  const keep = creditsAfterRefund({ sessions, amountPence: order.amountPence, refundedPence: refunded });
  const sessionsTotal = keep === 0 ? pkg.sessionsTotal : keep;
  const status =
    keep === 0 || pkg.status === "refunded"
      ? "refunded" // also a package on hold for a dispute, which stays held until that is decided
      : packageStatusFor({ sessionsTotal, sessionsUsed: pkg.sessionsUsed, expiresAt: pkg.expiresAt }, now);

  // A repeat of an event already applied.
  if (!orderChanged && sessionsTotal === pkg.sessionsTotal && status === pkg.status) {
    return new Response("Already applied", { status: 200 });
  }

  await db.update(packages).set({ sessionsTotal, status, updatedAt: now }).where(eq(packages.id, pkg.id));

  const booked = await bookedOn(pkg.id, now);
  const unpaid = Math.min(booked, Math.max(pkg.sessionsUsed - keep, 0));

  await recordAudit({
    actorId: null,
    action: "update",
    entity: "orders",
    entityId: order.id,
    subjectClientId: order.clientId,
    detail: `refunded ${displayPrice(refunded)}: client keeps ${keep} of ${sessions} session(s); ${unpaid} booked session(s) no longer paid for`,
  });

  await alertOwner(
    full ? "A payment was refunded" : "A payment was partly refunded",
    [
      full
        ? `A payment of ${displayPrice(order.amountPence)} was refunded in full in Stripe. The ${sessionsText(sessions)} it paid for have been removed from the client's account.`
        : `${displayPrice(refunded)} of a ${displayPrice(order.amountPence)} payment was refunded in Stripe. The client keeps ${keep} of the ${sessionsText(sessions)} it paid for.`,
      ...(unpaid > 0
        ? [
            `${sessionsText(unpaid)} already booked ${unpaid === 1 ? "is" : "are"} no longer paid for. Cancel ${unpaid === 1 ? "it" : "them"} under Appointments, or arrange payment with the client.`,
          ]
        : []),
    ],
    order.clientId
  );

  return new Response("Refund applied", { status: 200 });
}

/**
 * A client has disputed a payment with their bank.
 *
 * Stripe takes the money back while the dispute runs, so the sessions it
 * paid for go on hold. Sessions already booked are left for the owner to
 * decide on. The owner is told when evidence is due.
 */
export async function holdForDispute(dispute: DisputeObject): Promise<Response> {
  const found = await purchaseFor(dispute.payment_intent);
  if (!found) return new Response("Ignored", { status: 200 });
  const { order, pkg } = found;
  const now = new Date();

  const held = !!pkg && pkg.status !== "refunded";
  if (held) {
    await getDb().update(packages).set({ status: "refunded", updatedAt: now }).where(eq(packages.id, pkg.id));
  }
  const booked = pkg ? await bookedOn(pkg.id, now) : 0;
  const dueBy = dispute.evidence_details?.due_by;

  await recordAudit({
    actorId: null,
    action: "update",
    entity: "orders",
    entityId: order.id,
    subjectClientId: order.clientId,
    detail: `payment disputed (${dispute.reason ?? "no reason given"})${held ? ": sessions on hold" : ""}`,
  });

  await alertOwner(
    "A payment has been disputed",
    [
      `A client has disputed a payment of ${displayPrice(dispute.amount ?? order.amountPence)} with their bank.`,
      ...(held ? ["The sessions it paid for are on hold and cannot be booked until the dispute is decided."] : []),
      ...(booked > 0
        ? [`${sessionsText(booked)} already booked with this payment ${booked === 1 ? "is" : "are"} still in the diary.`]
        : []),
      dueBy
        ? `Respond in the Stripe Dashboard by ${ukDate(dueBy)}.`
        : "Check the Stripe Dashboard for what Stripe needs from you.",
    ],
    order.clientId
  );

  return new Response("Dispute recorded", { status: 200 });
}

/**
 * A dispute has been decided. Won, or an inquiry that closed without
 * becoming a dispute: the sessions come back. Lost: the money has gone, so
 * the payment is recorded as refunded and the sessions stay removed.
 */
export async function settleDispute(dispute: DisputeObject): Promise<Response> {
  const found = await purchaseFor(dispute.payment_intent);
  if (!found) return new Response("Ignored", { status: 200 });
  const { order, pkg } = found;
  const db = getDb();
  const now = new Date();
  const amount = displayPrice(dispute.amount ?? order.amountPence);

  if (disputeKeepsHold(dispute.status)) {
    if (order.status === "refunded") return new Response("Already applied", { status: 200 });
    await db
      .update(orders)
      .set({ status: "refunded", refundedAt: now, refundReason: "Dispute lost" })
      .where(eq(orders.id, order.id));
    await recordAudit({
      actorId: null,
      action: "update",
      entity: "orders",
      entityId: order.id,
      subjectClientId: order.clientId,
      detail: "dispute lost: sessions stay removed",
    });
    await alertOwner(
      "A disputed payment was lost",
      [`The dispute over a payment of ${amount} was decided in the client's favour. The sessions it paid for stay removed.`],
      order.clientId
    );
    return new Response("Dispute lost", { status: 200 });
  }

  // A payment refunded in full keeps its sessions removed whatever the dispute did.
  if (!pkg || pkg.status !== "refunded" || order.status === "refunded") {
    return new Response("Nothing on hold", { status: 200 });
  }

  await db
    .update(packages)
    .set({ status: packageStatusFor(pkg, now), updatedAt: now })
    .where(eq(packages.id, pkg.id));
  await recordAudit({
    actorId: null,
    action: "update",
    entity: "orders",
    entityId: order.id,
    subjectClientId: order.clientId,
    detail: `dispute closed (${dispute.status ?? "unknown"}): sessions available again`,
  });
  await alertOwner(
    "A disputed payment was decided in your favour",
    [`The dispute over a payment of ${amount} has closed in ThriveSphere's favour. The sessions it paid for are available to the client again.`],
    order.clientId
  );
  return new Response("Dispute won", { status: 200 });
}

/** The website order a Stripe payment belongs to, with the sessions it credited. */
async function purchaseFor(paymentIntentId: string | null | undefined) {
  if (!paymentIntentId) return null;
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.paymentIntentId, paymentIntentId)).limit(1);
  if (!order) return null;
  const [pkg] = await db.select().from(packages).where(eq(packages.orderId, order.id)).limit(1);
  return { order, pkg: pkg ?? null };
}

/** Sessions the checkout was for, as recorded on it in Stripe. */
async function sessionsBought(checkoutSessionId: string | null): Promise<number | null> {
  if (!checkoutSessionId) return null;
  const session = await retrieveCheckoutSession(checkoutSessionId);
  const parsed = parseCheckoutMetadata(session.metadata ?? {});
  return parsed.ok ? parsed.value.sessions : null;
}

/** Sessions still to come that were booked with this package. */
async function bookedOn(packageId: string, now: Date): Promise<number> {
  const rows = await getDb()
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(eq(appointments.packageId, packageId), eq(appointments.status, "scheduled"), gt(appointments.startsAt, now))
    );
  return rows.length;
}

function ukDate(unixSeconds: number): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Europe/London" }).format(
    new Date(unixSeconds * 1000)
  );
}

/** Tell ThriveSphere. A failed email must never fail the webhook. */
async function alertOwner(subject: string, lines: string[], clientId: string): Promise<void> {
  try {
    const email = paymentAlert({ subject, lines, clientId });
    const sent = await sendEmail({
      to: process.env.ENQUIRY_TO_EMAIL ?? brand.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
    if (!sent.ok) console.error("[stripe] owner alert not sent:", sent.reason);
  } catch (err) {
    console.error("[stripe] owner alert failed", err);
  }
}
