import type { Metadata } from "next";
import Link from "next/link";
import { requirePortalClient } from "@/lib/portal-guard";
import { SESSION_MINUTES, getPooledSlots } from "@/lib/queries/availability";
import { INITIAL_REVIEW, sessionsRemaining } from "@/lib/allocation";
import { bookingRequiresPayment, getClientCredits, nextBookingKind } from "@/lib/booking-engine";
import { groupSlotsByDay } from "@/lib/slot-groups";
import { SlotPicker } from "@/components/portal/SlotPicker";
import { NotCrisisNotice } from "@/components/NotCrisisNotice";
import { brand } from "@/data/site";

export const metadata: Metadata = { title: "Book a session", robots: { index: false, follow: false } };

export default async function BookPage() {
  // Registration, including the 18+ gate and consent, must be finished first.
  const { clientId } = await requirePortalClient();

  const [slots, owned, booking] = await Promise.all([
    getPooledSlots({ clientId }),
    getClientCredits(clientId),
    nextBookingKind(clientId),
  ]);

  // Only credit that can pay for this booking: review credit is for the review.
  const remaining = sessionsRemaining(owned, new Date(), booking);
  const mustPayFirst = bookingRequiresPayment() && remaining === 0;
  const firstBooking = booking === "review";
  const groups = groupSlotsByDay(slots);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 72px" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: "clamp(24px,4.6vw,30px)", fontWeight: 800, color: "var(--navy)" }}>
        {firstBooking ? `Book your ${INITIAL_REVIEW}` : "Book a session"}
      </h1>
      <p style={{ margin: "0 0 10px", fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
        Sessions are {SESSION_MINUTES} minutes, online. Times are shown in UK time. Your joining link
        appears in your account under Appointments — we never send it by email.
      </p>
      <p style={{ margin: "0 0 26px", fontSize: 14, lineHeight: 1.6, color: "var(--navy-soft)" }}>
        {remaining > 0
          ? `You have ${remaining} prepaid session${remaining === 1 ? "" : "s"}; booking uses one.`
          : brand.availabilityLine}
      </p>

      {mustPayFirst ? (
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 19, color: "var(--navy)" }}>
            {firstBooking ? `Buy your ${INITIAL_REVIEW} to book` : "Buy a session to book"}
          </h2>
          <p style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
            {firstBooking
              ? `Sessions are paid for before booking, and your first appointment is your ${INITIAL_REVIEW}. Buy it, then come back here to pick a time.`
              : "Sessions are paid for before booking. Choose a single session or an optional package, then come back here to pick a time."}
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
        <SlotPicker groups={groups} />
      )}

      <NotCrisisNotice style={{ marginTop: 30 }} />
    </div>
  );
}
