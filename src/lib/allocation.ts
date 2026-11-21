import { overlaps, type BusyPeriod, type Slot } from "./slots";

/**
 * Who a booking goes to, and what pays for it.
 *
 * Pure and tested. With more than one practitioner a client chooses a time,
 * not a person, and the service decides who takes it. Those rules — and the
 * rules about which prepaid session is spent — decide whether a client is
 * double-booked or charged twice, so they are asserted rather than trusted.
 */

const HOUR = 60 * 60_000;

/** Every practitioner's free times for one session length. */
export type PractitionerSlots = { practitionerId: string; slots: Slot[] };

/** A time the client can choose, and who could take it. */
export type PooledSlot = Slot & { practitionerIds: string[] };

/**
 * Merge each practitioner's free times into one list a client chooses from.
 *
 * A time is offered once however many practitioners are free then. Times that
 * clash with the client's own booked sessions are dropped, so nobody can book
 * themselves into two sessions at once.
 */
export function poolSlots(perPractitioner: PractitionerSlots[], clientBusy: BusyPeriod[] = []): PooledSlot[] {
  const byStart = new Map<number, PooledSlot>();

  for (const { practitionerId, slots } of perPractitioner) {
    for (const s of slots) {
      if (clientBusy.some((b) => overlaps(s.startsAt, s.endsAt, b.startsAt, b.endsAt))) continue;
      const key = s.startsAt.getTime();
      const pooled = byStart.get(key);
      if (pooled) {
        if (!pooled.practitionerIds.includes(practitionerId)) pooled.practitionerIds.push(practitionerId);
      } else {
        byStart.set(key, { startsAt: s.startsAt, endsAt: s.endsAt, practitionerIds: [practitionerId] });
      }
    }
  }

  return [...byStart.values()].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/**
 * The order in which to offer a booking to the practitioners free at that time.
 *
 * Continuity first: someone already working with a practitioner stays with
 * them. Otherwise the practitioner with the fewest upcoming sessions, so work
 * is shared out. Ties break on id, so the result never depends on query order.
 * The whole order is returned because the first choice may be taken by the
 * time the booking is written.
 */
export function rankPractitioners({
  candidates,
  previousPractitionerId,
  upcomingLoad,
}: {
  candidates: string[];
  previousPractitionerId?: string | null;
  upcomingLoad: Record<string, number>;
}): string[] {
  const unique = [...new Set(candidates)];
  return unique.sort((a, b) => {
    if (a === previousPractitionerId) return -1;
    if (b === previousPractitionerId) return 1;
    const load = (upcomingLoad[a] ?? 0) - (upcomingLoad[b] ?? 0);
    if (load !== 0) return load;
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

export type PackageCandidate = {
  id: string;
  status: string;
  sessionsTotal: number;
  sessionsUsed: number;
  expiresAt: Date | null;
  createdAt: Date;
  /** Bought as the Initial Wellbeing Needs Review rather than as sessions. */
  forReview?: boolean;
};

/** The `price_plans.slug` of the Initial Wellbeing Needs Review (checklist §6). */
export const REVIEW_PLAN_SLUG = "initial-consultation";

/** The `price_plans.slug` of a single support session: what free sessions are given as. */
export const SESSION_PLAN_SLUG = "individual-session";

/** What a booking is: the client's first appointment is their review. */
export type BookingKind = "review" | "session";

/**
 * Whether a package can pay for a booking of this kind.
 *
 * Review credit pays only for the review, so a £30 review cannot be spent on
 * a £40 session. The review itself can also be paid from session credit, for
 * a client who bought a package before booking anything.
 */
function canPay(p: PackageCandidate, now: Date, booking?: BookingKind): boolean {
  return (
    p.status === "active" &&
    p.sessionsUsed < p.sessionsTotal &&
    (p.expiresAt === null || p.expiresAt > now) &&
    (booking !== "session" || !p.forReview)
  );
}

/**
 * The package a new booking draws on, or null if the client has no credit.
 *
 * Only active, unexpired packages with sessions left that can pay for this
 * kind of booking. A review is paid from review credit first. Otherwise the
 * one expiring soonest is spent first, so a client never loses sessions to
 * expiry while holding a longer-lasting package; packages with no expiry come
 * last, oldest first.
 */
export function selectPackage<P extends PackageCandidate>(
  packages: P[],
  booking: BookingKind,
  now: Date = new Date()
): P | null {
  const usable = packages.filter((p) => canPay(p, now, booking));
  usable.sort((a, b) => {
    if (booking === "review" && !!a.forReview !== !!b.forReview) return a.forReview ? -1 : 1;
    if (a.expiresAt && b.expiresAt) return a.expiresAt.getTime() - b.expiresAt.getTime();
    if (a.expiresAt) return -1;
    if (b.expiresAt) return 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  return usable[0] ?? null;
}

/**
 * Sessions still to book across a client's packages: all of them, or only
 * those that can pay for the next booking when its kind is given.
 */
export function sessionsRemaining(
  packages: PackageCandidate[],
  now: Date = new Date(),
  booking?: BookingKind
): number {
  return packages
    .filter((p) => canPay(p, now, booking))
    .reduce((n, p) => n + (p.sessionsTotal - p.sessionsUsed), 0);
}

export const INITIAL_REVIEW = "Initial Wellbeing Needs Review";
export const SUPPORT_SESSION = "Wellbeing support session";

export type AppointmentKind = "initial" | "session";

/** What the client sees an appointment called. */
export function kindLabel(kind: string): string {
  return kind === "initial" ? INITIAL_REVIEW : SUPPORT_SESSION;
}

/** The kind of appointment a booking makes. */
export function kindFor(booking: BookingKind): AppointmentKind {
  return booking === "review" ? "initial" : "session";
}

/**
 * What a client's next booking is, from the appointments they have.
 *
 * Their initial consultation is done or booked once an `initial` appointment
 * is booked or completed. One that was cancelled, or is still being paid for,
 * leaves it to book; so does a missed one, because the review in it never
 * took place.
 */
export function nextKindFrom(appointments: { kind: string; status: string }[]): BookingKind {
  return appointments.some((a) => a.kind === "initial" && (a.status === "scheduled" || a.status === "completed"))
    ? "session"
    : "review";
}

/** Recorded on the old booking when a client moves an appointment. */
export const RESCHEDULED_REASON = "Rescheduled by client";

/**
 * The notice the Cancellation and Refund Policy asks for, to cancel or move an
 * appointment without the session counting as used. The owner confirmed 72
 * hours in the IT handover of 15 November 2026. Wording that states the rule
 * uses NOTICE_PERIOD, so the policy, emails and portal always match it.
 */
export const NOTICE_HOURS = 72;
export const NOTICE_PERIOD = `${NOTICE_HOURS} hours`;

/** The last moment an appointment can be cancelled or moved free of charge. */
export function noticeDeadline(startsAt: Date): Date {
  return new Date(startsAt.getTime() - NOTICE_HOURS * HOUR);
}

export type CancellationOutcome =
  | { allowed: false; reason: string }
  | { allowed: true; late: boolean; returnsSession: boolean };

/**
 * What happens when a client cancels.
 *
 * With 72 hours' notice or more the session goes back to their package. With
 * less, the session counts as used, as the Cancellation and Refund Policy says.
 * A session that has started can no longer be cancelled from the account.
 */
export function cancellationOutcome({
  startsAt,
  status,
  now = new Date(),
}: {
  startsAt: Date;
  status: string;
  now?: Date;
}): CancellationOutcome {
  if (status !== "scheduled") return { allowed: false, reason: "This appointment is no longer booked." };
  if (startsAt <= now) return { allowed: false, reason: "This appointment has already started." };
  const late = startsAt.getTime() - now.getTime() < NOTICE_HOURS * HOUR;
  return { allowed: true, late, returnsSession: !late };
}

/** Rescheduling keeps the session, so it needs the full notice period. */
export function canReschedule({ startsAt, status, now = new Date() }: { startsAt: Date; status: string; now?: Date }): boolean {
  return status === "scheduled" && startsAt.getTime() - now.getTime() >= NOTICE_HOURS * HOUR;
}

/**
 * Whether a database error is the no-overlap rule refusing a booking.
 *
 * Postgres reports an exclusion-constraint violation as 23P01. Drizzle may
 * wrap the driver error, so the cause is checked too.
 */
export function isOverlapViolation(err: unknown): boolean {
  const code = (e: unknown) => (e && typeof e === "object" && "code" in e ? (e as { code: unknown }).code : undefined);
  const cause = err && typeof err === "object" && "cause" in err ? (err as { cause: unknown }).cause : undefined;
  return code(err) === "23P01" || code(cause) === "23P01";
}

/**
 * Paying for a booking while making it (IT handover §19, Route A).
 *
 * Stripe keeps a checkout open for at least 30 minutes; one more covers the
 * time the request takes to reach it. The chosen time stays held a little
 * longer than the checkout, so a payment completed in its last seconds still
 * finds its appointment waiting.
 */
export const CHECKOUT_MINUTES = 31;
export const HOLD_GRACE_MINUTES = 15;

export function holdTimes(now: Date): { checkoutExpiresAt: Date; holdExpiresAt: Date } {
  const checkoutExpiresAt = new Date(now.getTime() + CHECKOUT_MINUTES * 60_000);
  return { checkoutExpiresAt, holdExpiresAt: new Date(checkoutExpiresAt.getTime() + HOLD_GRACE_MINUTES * 60_000) };
}

/**
 * How a booking is paid for.
 *
 * The initial consultation is paid at Stripe as it is booked (§19), unless the
 * client already holds credit that pays for it, bought before that rule. Later
 * sessions are paid from credit, as before.
 */
export function bookingRoute(booking: BookingKind, creditForThisBooking: number): "checkout" | "credit" {
  return booking === "review" && creditForThisBooking === 0 ? "checkout" : "credit";
}
