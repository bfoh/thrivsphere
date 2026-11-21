import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Payment cancelled", robots: { index: false, follow: false } };

/** `?booking=1`: the client left Stripe without paying for the time they chose. */
export default async function PaymentCancelledPage({ searchParams }: { searchParams: Promise<{ booking?: string }> }) {
  const booking = (await searchParams).booking === "1";
  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "64px 24px", textAlign: "center" }}>
      <h1 style={{ margin: "0 0 10px", fontSize: 26, fontWeight: 800, color: "var(--navy)" }}>
        Payment cancelled
      </h1>
      <p style={{ margin: "0 0 22px", fontSize: 15.5, lineHeight: 1.6, color: "var(--ink)" }}>
        {booking
          ? "Nothing has been charged, and the appointment is not booked. You can choose a time again whenever you're ready. "
          : "Nothing has been charged. "}
        If cost is a barrier, please talk to us before deciding not to come — concessionary places may be
        available.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href={booking ? "/portal/book" : "/portal/purchase"} className="pill pill-teal" style={{ padding: "13px 26px", fontSize: 14.5 }}>
          {booking ? "Choose a time" : "Try again"}
        </Link>
        <Link href="/portal/messages" className="pill pill-ghost" style={{ padding: "13px 26px", fontSize: 14.5 }}>
          Message us
        </Link>
      </div>
    </div>
  );
}
