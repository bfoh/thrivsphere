import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { BookingForm } from "@/components/BookingForm";
import { Icon } from "@/components/icons";
import { NotCrisisNotice } from "@/components/NotCrisisNotice";
import { ScopeOfPractice } from "@/components/ScopeOfPractice";

export const metadata: Metadata = {
  title: "Book a Consultation",
  description: "Book a confidential online wellbeing session with ThrivSphere. Reach out in confidence and we'll be in touch.",
};

const steps = [
  { icon: "chat", title: "Reach out", text: "Complete the confidential form below. Share only what feels comfortable." },
  { icon: "users", title: "We match you", text: "We review your request and confirm the right support — or signpost you elsewhere if we are not the right fit." },
  { icon: "heart", title: "Your first session", text: "An initial wellbeing consultation (£20) to understand your needs and goals — online, from anywhere." },
];

export default function BookPage() {
  return (
    <PageShell
      eyebrow="Book a Consultation"
      watermark="Book"
      title="Take the first step, in confidence"
      intro="Finding the right fit matters. Tell us a little about what you're looking for and we'll be in touch to arrange your session — usually within two working days."
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginBottom: 34 }} className="prog-grid">
        {steps.map((s, i) => (
          <div key={s.title} className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--grad-teal)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={s.icon} size={21} stroke="#fff" />
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--gold)" }}>STEP {i + 1}</span>
            </div>
            <h3 style={{ margin: "0 0 6px", fontSize: 16.5, color: "var(--navy)" }}>{s.title}</h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--ink)" }}>{s.text}</p>
          </div>
        ))}
      </div>

      <NotCrisisNotice style={{ marginBottom: 26 }} />

      <p style={{ margin: "0 0 20px", fontSize: 14.5, color: "var(--navy-soft)" }}>
        Already have an account?{" "}
        <Link href="/sign-in" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
          Sign in
        </Link>{" "}
        to book from your account.
      </p>

      <BookingForm />

      <div style={{ marginTop: 44 }}>
        <ScopeOfPractice compact />
      </div>
    </PageShell>
  );
}
