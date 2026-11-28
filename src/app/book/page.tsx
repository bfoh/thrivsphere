import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { CallbackForm } from "@/components/CallbackForm";
import { Icon } from "@/components/icons";
import { NotCrisisNotice } from "@/components/NotCrisisNotice";
import { ScopeOfPractice } from "@/components/ScopeOfPractice";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { bookCta, brand, callbackCta } from "@/data/site";
import { getCurrentActor } from "@/lib/session";
import { getInitialConsultationPrice } from "@/lib/queries/catalogue";
import { NOTICE_PERIOD } from "@/lib/allocation";

export const metadata: Metadata = {
  title: "Book Initial Wellbeing Consultation",
  description:
    "Book your Initial Wellbeing Consultation with ThriveSphere Wellbeing online, or request a callback. A 50-minute online consultation; flexible appointments, including evenings and weekends, subject to availability.",
  alternates: { canonical: "/book" },
};

/**
 * The two ways in (IT handover §19): book and pay online (Route A, the main
 * one), or request a callback (Route B). Both lead to the same paid initial
 * consultation, in which the practitioner carries out the Wellbeing Needs
 * Review; nobody has to complete it before booking.
 */
export default async function BookPage() {
  const [actor, price] = await Promise.all([getCurrentActor(), getInitialConsultationPrice()]);
  // New visitors create an account first; someone signed in goes straight to the times.
  const bookHref = actor ? "/portal/book" : "/sign-up";

  const steps = [
    { title: "Create your account", text: "Sign up with your email address, or sign in if you already have an account." },
    { title: "A few details", text: "Confirm you are 18 or over, add your contact details and read how our service works. We'll also ask whether you'd like to give an emergency contact." },
    {
      title: "Choose and pay",
      text: `Choose a practitioner and a time, accept the booking terms and ${NOTICE_PERIOD}' cancellation notice, and pay ${price.label} securely by card. You'll receive a confirmation and a receipt.`,
    },
  ];

  return (
    <PageShell
      eyebrow="Book"
      watermark="Book"
      title="Book your Initial Wellbeing Consultation"
      intro={`Support begins with a 50-minute online Initial Wellbeing Consultation, ${price.label}. Your practitioner carries out your Wellbeing Needs Review with you in it, so there is nothing to complete beforehand. ${brand.availabilityLine}`}
    >
      <div className="support-grid" style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 22, alignItems: "stretch", marginBottom: 34 }}>
        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 21, color: "var(--navy)" }}>Book online</h2>
          <ol style={{ margin: "0 0 22px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
            {steps.map((s, i) => (
              <li key={s.title} style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
                <span style={{ flex: "none", width: 30, height: 30, borderRadius: "50%", background: "var(--grad-teal)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13.5, fontWeight: 800 }}>
                  {i + 1}
                </span>
                <span>
                  <strong style={{ display: "block", fontSize: 15, color: "var(--navy)" }}>{s.title}</strong>
                  <span style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink)" }}>{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="cta-stack" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <Link href={bookHref} className="pill pill-gold" style={{ padding: "14px 26px", fontSize: 15 }}>
              {bookCta.label} <Icon name="arrow" size={17} />
            </Link>
            {!actor && (
              <span style={{ fontSize: 14, color: "var(--navy-soft)" }}>
                Already registered?{" "}
                <Link href="/sign-in" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
                  Sign in
                </Link>
              </span>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column" }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 21, color: "var(--navy)" }}>Prefer to talk first?</h2>
          <p style={{ margin: "0 0 20px", fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)" }}>
            Request a callback and we&apos;ll be in touch using the contact method you choose, to arrange
            your consultation. We then send you a secure link to book and pay.
          </p>
          <div style={{ marginTop: "auto" }}>
            <Link href={callbackCta.href} className="pill pill-teal" style={{ padding: "13px 24px", fontSize: 14.5 }}>
              {callbackCta.label} <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
      </div>

      <NotCrisisNotice style={{ marginBottom: 34 }} />

      <section id="callback" style={{ scrollMarginTop: 110 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "var(--navy)" }}>Request a Callback</h2>
        <p style={{ margin: "0 0 20px", fontSize: 15.5, lineHeight: 1.6, color: "var(--ink)", maxWidth: 700 }}>
          Leave your details and the times that suit you. You can also email{" "}
          <a href={`mailto:${brand.email}`} style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
            {brand.email}
          </a>
          .
        </p>
        <div className="support-grid" style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 24, alignItems: "start" }}>
          <CallbackForm price={price.label} />
          <WhatsAppLink />
        </div>
      </section>

      <div style={{ marginTop: 44 }}>
        <ScopeOfPractice compact />
      </div>
    </PageShell>
  );
}
