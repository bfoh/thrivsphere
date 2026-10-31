import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { BookingForm } from "@/components/BookingForm";
import { Icon } from "@/components/icons";
import { NotCrisisNotice } from "@/components/NotCrisisNotice";
import { ScopeOfPractice } from "@/components/ScopeOfPractice";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { brand } from "@/data/site";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description:
    "Book an online appointment with ThriveSphere Wellbeing: start with an Initial Wellbeing Needs Review. Flexible appointments, including evenings and weekends, subject to availability.",
};

const steps = [
  { icon: "users", title: "Create your account", text: "Sign up with your email address. It takes a minute." },
  { icon: "shield", title: "Register", text: "Confirm you are 18 or over, add your contact details, and read and agree to how our service works." },
  { icon: "compass", title: "Choose a time", text: "Pick an available time for your Initial Wellbeing Needs Review. You'll get a confirmation and reminders by email." },
];

export default function BookPage() {
  return (
    <PageShell
      eyebrow="Book an Appointment"
      watermark="Book"
      title="Book your appointment online"
      intro={`Support begins with an Initial Wellbeing Needs Review — a 50-minute online conversation. ${brand.availabilityLine}`}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginBottom: 24 }} className="prog-grid">
        {steps.map((s, i) => (
          <div key={s.title} className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--grad-teal)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={s.icon} size={21} stroke="#fff" />
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--gold)" }}>STEP {i + 1}</span>
            </div>
            <h2 style={{ margin: "0 0 6px", fontSize: 16.5, color: "var(--navy)" }}>{s.title}</h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--ink)" }}>{s.text}</p>
          </div>
        ))}
      </div>

      <div className="cta-stack" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 34 }}>
        <Link href="/sign-up" className="pill pill-gold" style={{ padding: "14px 28px", fontSize: 15 }}>
          Create an account <Icon name="arrow" size={17} />
        </Link>
        <span style={{ fontSize: 14.5, color: "var(--navy-soft)" }}>
          Already registered?{" "}
          <Link href="/sign-in" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
            Sign in
          </Link>{" "}
          to book follow-up sessions or buy a package.
        </span>
      </div>

      <NotCrisisNotice style={{ marginBottom: 34 }} />

      <h2 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "var(--navy)" }}>
        Prefer to arrange it with us?
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: 15.5, lineHeight: 1.6, color: "var(--ink)", maxWidth: 700 }}>
        Send a request with the days and times that suit you and we&apos;ll be in touch to arrange
        your appointment. You can also email{" "}
        <a href={`mailto:${brand.email}`} style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
          {brand.email}
        </a>
        .
      </p>

      <div className="support-grid" style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 24, alignItems: "start" }}>
        <BookingForm />
        <WhatsAppLink />
      </div>

      <div style={{ marginTop: 44 }}>
        <ScopeOfPractice compact />
      </div>
    </PageShell>
  );
}
