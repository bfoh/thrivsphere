import type { Metadata } from "next";
import Link from "next/link";
import { requirePortalClient } from "@/lib/portal-guard";
import { SESSION_MINUTES, getBookablePractitioners, getPooledSlots } from "@/lib/queries/availability";
import { NOTICE_PERIOD, bookingRoute, sessionsRemaining } from "@/lib/allocation";
import { bookingRequiresPayment, getClientCredits, getSessionGate, nextBookingKind } from "@/lib/booking-engine";
import { getInitialConsultationPrice } from "@/lib/queries/catalogue";
import { groupSlotsByDay } from "@/lib/slot-groups";
import { SlotPicker } from "@/components/portal/SlotPicker";
import { NotCrisisNotice } from "@/components/NotCrisisNotice";
import { brand } from "@/data/site";

export const metadata: Metadata = { title: "Book a session", robots: { index: false, follow: false } };

const CONSULTATION = "Initial Wellbeing Consultation";

/**
 * Choosing a time.
 *
 * The first appointment is the initial consultation, paid for at Stripe as it
 * is booked (IT handover §19, Route A); a client who already holds credit for
 * it books from that. Later sessions are booked from credit. Either way the
 * client can choose a practitioner or take the first available.
 *
 * `?with=` preselects a practitioner: the booking link staff send after a
 * callback (§19, Route B) uses it.
 */
export default async function BookPage({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  // Registration, including the 18+ gate and consent, must be finished first.
  const { clientId } = await requirePortalClient();
  const { with: withId } = await searchParams;

  const now = new Date();
  const [slots, owned, booking, bookable, price, gate] = await Promise.all([
    getPooledSlots({ clientId, now }),
    getClientCredits(clientId),
    nextBookingKind(clientId),
    getBookablePractitioners(),
    getInitialConsultationPrice(),
    getSessionGate(clientId),
  ]);

  // Only credit that can pay for this booking: review credit is for the review.
  const remaining = sessionsRemaining(owned, now, booking);
  const route = bookingRoute(booking, remaining);
  const firstBooking = booking === "review";
  // Ongoing sessions open only after the practitioner records Suitable.
  const sessionsClosed = !firstBooking && !gate.open ? gate.message : null;
  const mustPayFirst = route === "credit" && !firstBooking && bookingRequiresPayment() && remaining === 0;
  // Clients see practitioners by name only; one without a name is still
  // offered through "first available".
  const practitioners = bookable.filter((p) => p.displayName).map((p) => ({ id: p.id, name: p.displayName! }));
  const groups = groupSlotsByDay(slots);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 72px" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: "clamp(24px,4.6vw,30px)", fontWeight: 800, color: "var(--navy)" }}>
        {firstBooking ? `Book your ${CONSULTATION}` : "Book a session"}
      </h1>
      <p style={{ margin: "0 0 10px", fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
        {firstBooking
          ? `A ${SESSION_MINUTES}-minute online consultation, ${price.label}. Your practitioner carries out your Wellbeing Needs Review with you in it, so there is nothing to complete beforehand. `
          : `Sessions are ${SESSION_MINUTES} minutes, online. `}
        Times are shown in UK time. Your joining link appears in your account under Appointments — we never
        send it by email.
      </p>
      <p style={{ margin: "0 0 26px", fontSize: 14, lineHeight: 1.6, color: "var(--navy-soft)" }}>
        {route === "checkout"
          ? `Choose a practitioner and a time, then pay securely. To cancel or move free of charge, please give at least ${NOTICE_PERIOD}' notice.`
          : remaining > 0
            ? `You have ${remaining} prepaid session${remaining === 1 ? "" : "s"}; booking uses one.`
            : brand.availabilityLine}
      </p>

      {sessionsClosed ? (
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 19, color: "var(--navy)" }}>Next steps</h2>
          <p style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>{sessionsClosed}</p>
          <Link href="/portal/messages" className="pill pill-teal" style={{ padding: "12px 24px", fontSize: 14.5 }}>
            Message us
          </Link>
        </div>
      ) : mustPayFirst ? (
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 19, color: "var(--navy)" }}>Buy a session to book</h2>
          <p style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
            Sessions are paid for before booking. Choose a single session or an optional package, then come back
            here to pick a time.
          </p>
          <Link href="/portal/purchase" className="pill pill-gold" style={{ padding: "12px 24px", fontSize: 14.5 }}>
            Buy sessions
          </Link>
        </div>
      ) : groups.length === 0 ? (
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 19, color: "var(--navy)" }}>No times available right now</h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
            There are no bookable times at the moment.{" "}
            <Link href="/portal/messages" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
              Send us a message
            </Link>{" "}
            and we&apos;ll arrange a time with you.
          </p>
        </div>
      ) : (
        <SlotPicker
          groups={groups}
          practitioners={practitioners}
          defaultPractitionerId={withId}
          noticePeriod={NOTICE_PERIOD}
          checkout={route === "checkout" ? { name: CONSULTATION, price: price.label, minutes: SESSION_MINUTES } : undefined}
        />
      )}

      <NotCrisisNotice style={{ marginTop: 30 }} />
    </div>
  );
}
