"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, consents, orders, pricePlans } from "@/db/schema";
import { getCurrentActor } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { createCheckoutSession } from "@/lib/stripe";
import {
  INITIAL_REVIEW,
  NOTICE_PERIOD,
  REVIEW_PLAN_SLUG,
  bookingRoute,
  holdTimes,
  sessionsRemaining,
} from "@/lib/allocation";
import {
  getClientCredits,
  getSessionGate,
  grantPackage,
  nextBookingKind,
  notifyClient,
  notifyPractitioner,
  placeBooking,
  releaseClientHolds,
  releaseHold,
  releaseSession,
  reserveSession,
} from "@/lib/booking-engine";
import { getOffer, type PriceOffer } from "@/lib/queries/discounts";
import { penceLabel } from "@/lib/discounts";
import { sendEmail } from "@/lib/email";
import { bookingConfirmation, sessionsAdded } from "@/lib/email-templates";
import { getOnboardingState } from "@/lib/onboarding";
import { SESSION_MINUTES } from "@/lib/queries/availability";
import { formatAppointment } from "@/lib/slot-groups";
import { policies } from "@/data/policies";
import type { PaymentState } from "@/lib/payment-state";

/** What an order records about the discount it was bought with. */
function discountFields(offer: PriceOffer) {
  return {
    amountPence: offer.pricePence,
    listPricePence: offer.listPence,
    discountId: offer.discount?.id ?? null,
    discountPence: offer.discountPence,
    discountLabel: offer.discount?.label ?? null,
  };
}

/** Shown on Stripe's page under the product, so the client sees the reduction. */
function discountLine(offer: PriceOffer): string | null {
  return offer.discount
    ? `${offer.discount.label}: ${penceLabel(offer.discountPence)} off the ${penceLabel(offer.listPence)} price`
    : null;
}

/**
 * Nothing to pay (a 100% concession): record a settled £0 order and credit
 * the sessions now, without Stripe, which cannot take a £0 payment.
 */
async function settleFreeOrder(
  clientId: string,
  plan: typeof pricePlans.$inferSelect,
  offer: PriceOffer
) {
  const db = getDb();
  const [order] = await db
    .insert(orders)
    .values({
      clientId,
      pricePlanId: plan.id,
      planNameAtPurchase: plan.name,
      currency: plan.currency,
      status: "paid",
      paidAt: new Date(),
      complimentary: true,
      ...discountFields(offer),
    })
    .returning();
  const { pkg } = await grantPackage({ clientId, orderId: order.id, sessions: plan.sessions, validityDays: plan.validityDays });
  return { order, pkg };
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000")
  );
}

/**
 * Start a hosted checkout for a plan.
 *
 * The amount is read from our own price list here rather than taken from the
 * request, so the client cannot choose what to pay. A pending order is written
 * before redirecting, so a payment that completes while the browser is closed
 * still has a row for the webhook to settle against.
 */
export async function startCheckout(
  _prev: PaymentState,
  formData: FormData
): Promise<PaymentState> {
  const planSlug = String(formData.get("planSlug") ?? "").trim();
  if (!planSlug) return { status: "error", message: "Please choose a plan." };

  const actor = await getCurrentActor();
  if (!actor) return { status: "error", message: "Please sign in first." };
  if (!actor.clientId) return { status: "error", message: "Please finish registering first." };

  const db = getDb();
  const [plan] = await db
    .select()
    .from(pricePlans)
    .where(and(eq(pricePlans.slug, planSlug), eq(pricePlans.active, true)))
    .limit(1);

  if (!plan) return { status: "error", message: "That plan is no longer available." };
  // Paid as it is booked (§19), with the time held: never bought on its own.
  if (plan.slug === REVIEW_PLAN_SLUG) {
    return { status: "error", message: `Your ${INITIAL_REVIEW} is paid for as you book it. Choose a time under Book.` };
  }
  // Every other plan pays for ongoing sessions, which open only once the
  // practitioner records Suitable (IT handover §13.1).
  const gate = await getSessionGate(actor.clientId);
  if (!gate.open) return { status: "error", message: gate.message };

  // Their concession or the code they entered, worked out here: the client
  // never says what they pay.
  const offer = await getOffer({
    clientId: actor.clientId,
    planSlug: plan.slug,
    listPence: plan.amountPence,
    code: String(formData.get("code") ?? ""),
  });
  if (offer.codeError) return { status: "error", message: offer.codeError };

  const [client] = await db
    .select({ email: clients.email })
    .from(clients)
    .where(eq(clients.id, actor.clientId))
    .limit(1);

  if (offer.pricePence === 0) {
    const { order } = await settleFreeOrder(actor.clientId, plan, offer);
    await recordAudit({
      actorId: actor.userId,
      action: "create",
      entity: "orders",
      entityId: order.id,
      subjectClientId: actor.clientId,
      detail: `${plan.name} at no charge (${offer.discount?.label ?? "discount"})`,
    });
    if (client?.email) {
      const email = sessionsAdded({ sessions: plan.sessions, consultation: false });
      const sent = await sendEmail({ to: client.email, subject: email.subject, text: email.text, html: email.html });
      if (!sent.ok) console.error("[payments] sessions-added email not sent:", sent.reason);
    }
    redirect("/portal/payment/success?free=1");
  }

  const [order] = await db
    .insert(orders)
    .values({
      clientId: actor.clientId,
      pricePlanId: plan.id,
      planNameAtPurchase: plan.name,
      currency: plan.currency,
      status: "pending",
      ...discountFields(offer),
    })
    .returning();

  let url: string | null = null;
  try {
    const session = await createCheckoutSession({
      amountPence: offer.pricePence,
      currency: plan.currency,
      productName: `ThriveSphere — ${plan.name}`,
      description: [plan.blurb, discountLine(offer)].filter(Boolean).join(" · ") || undefined,
      successUrl: `${siteUrl()}/portal/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl()}/portal/payment/cancelled`,
      customerEmail: client?.email ?? undefined,
      metadata: {
        orderId: order.id,
        clientId: actor.clientId,
        planSlug: plan.slug,
        planName: plan.name,
        sessions: String(plan.sessions),
        validityDays: plan.validityDays == null ? "" : String(plan.validityDays),
        discountId: offer.discount?.id ?? "",
      },
      // Keyed on the order alone, so retrying this request can never open a
      // second Stripe session for the same order.
      idempotencyKey: `order-${order.id}`,
    });

    url = session.url;
    await db
      .update(orders)
      .set({ checkoutSessionId: session.id })
      .where(eq(orders.id, order.id));
  } catch (err) {
    console.error("[payments] failed to create checkout session", err);
    await db.update(orders).set({ status: "failed" }).where(eq(orders.id, order.id));
    return {
      status: "error",
      message: "We couldn't start the payment just now. Please try again, or contact us.",
    };
  }

  await recordAudit({
    actorId: actor.userId,
    action: "create",
    entity: "orders",
    entityId: order.id,
    subjectClientId: actor.clientId,
    detail: `started checkout for ${plan.name}${offer.discount ? ` with ${offer.discount.label} (${penceLabel(offer.discountPence)} off)` : ""}`,
  });

  if (!url) return { status: "error", message: "Payment could not be started." };
  redirect(url);
}

/**
 * Book the initial consultation and pay for it in one go (IT handover §19,
 * Route A).
 *
 * The client has chosen a time, and a practitioner or "first available", and
 * accepted the booking terms and the 72-hour cancellation notice. The time is
 * held for them, so nobody else can take it while they pay, and they are sent
 * to Stripe. The webhook turns the hold into a booking once Stripe confirms
 * payment; if they do not pay, the hold is released when the checkout expires.
 * The amount is read from our own price list, never from the request.
 */
export async function startBookingCheckout(_prev: PaymentState, formData: FormData): Promise<PaymentState> {
  const actor = await getCurrentActor();
  if (!actor) return { status: "error", message: "Please sign in first." };
  const onboarding = await getOnboardingState(actor.userId);
  if (onboarding.step !== "complete" || !onboarding.clientId) {
    return { status: "error", message: "Please finish registering first." };
  }
  const clientId = onboarding.clientId;

  const startsAt = new Date(String(formData.get("startsAt") ?? ""));
  if (Number.isNaN(startsAt.getTime())) return { status: "error", message: "Please choose a time." };
  const practitionerId = String(formData.get("practitionerId") ?? "").trim() || null;
  if (formData.get("bookingTerms") !== "on") {
    return {
      status: "error",
      message: `Please accept the booking terms and the ${NOTICE_PERIOD}' cancellation notice to continue.`,
    };
  }

  const db = getDb();
  const now = new Date();
  const [booking, owned] = await Promise.all([nextBookingKind(clientId), getClientCredits(clientId)]);
  if (booking !== "review") {
    return { status: "error", message: `Your ${INITIAL_REVIEW} is already booked. You'll find it under Appointments.` };
  }
  if (bookingRoute(booking, sessionsRemaining(owned, now, booking)) !== "checkout") {
    return { status: "error", message: "Your consultation is already paid for. Choose a time to book it." };
  }

  const [plan] = await db
    .select()
    .from(pricePlans)
    .where(and(eq(pricePlans.slug, REVIEW_PLAN_SLUG), eq(pricePlans.active, true)))
    .limit(1);
  if (!plan) {
    return { status: "error", message: "Online booking isn't available just now. Please request a callback instead." };
  }

  const offer = await getOffer({
    clientId,
    planSlug: plan.slug,
    listPence: plan.amountPence,
    code: String(formData.get("code") ?? ""),
    now,
  });
  if (offer.codeError) return { status: "error", message: offer.codeError };

  // An earlier visit to Stripe that was abandoned holds a time; let it go.
  await releaseClientHolds(clientId);

  // The separate, unticked booking acknowledgement (§15.1), pinned to the
  // version of the Cancellation and Refund Policy on screen.
  const h = await headers();
  const acknowledge = () =>
    db.insert(consents).values({
      clientId,
      type: "booking_terms",
      policySlug: "payments",
      policyVersion: policies.payments?.version ?? null,
      granted: true,
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent") ?? null,
    });

  if (offer.pricePence === 0) {
    // Nothing to pay: credit the consultation and book it straight away.
    const { order } = await settleFreeOrder(clientId, plan, offer);
    const packageId = await reserveSession(clientId, "review", now);
    const placed = await placeBooking({
      clientId,
      startsAt,
      kind: "initial",
      packageId,
      onlyPractitionerId: practitionerId,
      now,
    });
    if (!placed.ok) {
      // The consultation stays in their account; they choose another time.
      if (packageId) await releaseSession(packageId);
      return { status: "error", message: placed.message };
    }
    await acknowledge();
    await recordAudit({
      actorId: actor.userId,
      action: "create",
      entity: "appointments",
      entityId: placed.appointmentId,
      subjectClientId: clientId,
      detail: `booked ${plan.name} at ${startsAt.toISOString()} at no charge (${offer.discount?.label ?? "discount"}); order ${order.id}`,
    });
    await Promise.all([
      notifyClient(placed.appointmentId, clientId, bookingConfirmation(startsAt), "booking_confirmation"),
      notifyPractitioner(placed.practitionerId, "booked", startsAt),
    ]);
    return {
      status: "ok",
      message: "Your consultation is booked, with nothing to pay. You'll find it, with your joining link, under Appointments.",
    };
  }

  const { checkoutExpiresAt, holdExpiresAt } = holdTimes(now);
  const [order] = await db
    .insert(orders)
    .values({
      clientId,
      pricePlanId: plan.id,
      planNameAtPurchase: plan.name,
      currency: plan.currency,
      status: "pending",
      ...discountFields(offer),
    })
    .returning();

  const placed = await placeBooking({
    clientId,
    startsAt,
    kind: "initial",
    packageId: null,
    onlyPractitionerId: practitionerId,
    hold: { orderId: order.id, expiresAt: holdExpiresAt },
    now,
  });
  if (!placed.ok) {
    await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, order.id));
    return { status: "error", message: placed.message };
  }

  await acknowledge();

  const [client] = await db.select({ email: clients.email }).from(clients).where(eq(clients.id, clientId)).limit(1);

  let url: string | null = null;
  try {
    const session = await createCheckoutSession({
      amountPence: offer.pricePence,
      currency: plan.currency,
      productName: `ThriveSphere — ${plan.name}`,
      description: [`${formatAppointment(startsAt)} (UK time), ${SESSION_MINUTES} minutes, online`, discountLine(offer)]
        .filter(Boolean)
        .join(" · "),
      successUrl: `${siteUrl()}/portal/payment/success?booking=1`,
      cancelUrl: `${siteUrl()}/portal/payment/cancelled?booking=1`,
      customerEmail: client?.email ?? undefined,
      metadata: {
        orderId: order.id,
        clientId,
        planSlug: plan.slug,
        planName: plan.name,
        sessions: String(plan.sessions),
        validityDays: plan.validityDays == null ? "" : String(plan.validityDays),
        bookingStartsAt: startsAt.toISOString(),
        bookingPractitionerId: placed.practitionerId,
        discountId: offer.discount?.id ?? "",
      },
      idempotencyKey: `order-${order.id}`,
      expiresAt: checkoutExpiresAt,
    });
    url = session.url;
    await db.update(orders).set({ checkoutSessionId: session.id }).where(eq(orders.id, order.id));
  } catch (err) {
    console.error("[payments] failed to create booking checkout", err);
    await releaseHold(order.id);
    await db.update(orders).set({ status: "failed" }).where(eq(orders.id, order.id));
    return { status: "error", message: "We couldn't start the payment just now. Please try again, or request a callback." };
  }

  await recordAudit({
    actorId: actor.userId,
    action: "create",
    entity: "orders",
    entityId: order.id,
    subjectClientId: clientId,
    detail: `started booking checkout for ${plan.name} at ${startsAt.toISOString()}`,
  });

  if (!url) {
    await releaseHold(order.id);
    return { status: "error", message: "Payment could not be started." };
  }
  redirect(url);
}
