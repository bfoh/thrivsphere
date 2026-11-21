import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Payment received", robots: { index: false, follow: false } };

/**
 * Confirmation only.
 *
 * Sessions are granted, and a paid booking confirmed, by the Stripe webhook,
 * not here — someone may close the browser the instant they pay, and their
 * booking must still go through. So this page never writes anything; it
 * reassures and points onward. `?booking=1` is a payment made while booking.
 */
export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ booking?: string }> }) {
  const booking = (await searchParams).booking === "1";
  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "64px 24px", textAlign: "center" }}>
      <div style={{ width: 66, height: 66, margin: "0 auto 16px", borderRadius: "50%", background: "rgba(79,168,168,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="check" size={34} stroke="var(--teal-deep)" />
      </div>
      <h1 style={{ margin: "0 0 10px", fontSize: 26, fontWeight: 800, color: "var(--navy)" }}>
        Thank you — payment received
      </h1>
      <p style={{ margin: "0 0 22px", fontSize: 15.5, lineHeight: 1.6, color: "var(--ink)" }}>
        {booking
          ? "Your Initial Wellbeing Consultation is being confirmed now. You'll receive a confirmation and a receipt by email, and the appointment appears under Appointments within a minute or two. If it doesn't, please refresh — and if anything looks wrong, message us and we'll sort it out."
          : "Your sessions are being added to your account now. If they don't appear within a minute or two, please refresh — and if anything looks wrong, message us and we'll sort it out."}
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        {booking ? (
          <Link href="/portal/appointments" className="pill pill-gold" style={{ padding: "13px 26px", fontSize: 14.5 }}>
            See my appointments <Icon name="arrow" size={16} />
          </Link>
        ) : (
          <Link href="/portal/book" className="pill pill-gold" style={{ padding: "13px 26px", fontSize: 14.5 }}>
            Book a session <Icon name="arrow" size={16} />
          </Link>
        )}
        <Link href="/portal" className="pill pill-ghost" style={{ padding: "13px 26px", fontSize: 14.5 }}>
          Back to my account
        </Link>
      </div>
    </div>
  );
}
