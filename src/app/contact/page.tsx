import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { NotCrisisNotice } from "@/components/NotCrisisNotice";
import { SignpostList } from "@/components/SignpostList";
import { EnquiryForm } from "@/components/EnquiryForm";
import { Icon } from "@/components/icons";
import { brand } from "@/data/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with ThrivSphere Wellbeing CIC in confidence, or find emergency and specialist support if you need help right now.",
};

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="Contact Us"
      watermark="Contact"
      title="Get in touch, in confidence"
      intro="Tell us a little about what you're looking for and we'll be in touch. We usually reply within two working days."
    >
      <NotCrisisNotice style={{ marginBottom: 34 }} />

      <div className="support-grid" style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 26 }}>
        <EnquiryForm />

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 18, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="mail" size={20} stroke="var(--teal)" /> Email us
            </h2>
            <a
              href={`mailto:${brand.email}`}
              style={{ fontSize: 15.5, fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none" }}
            >
              {brand.email}
            </a>
            <p style={{ margin: "12px 0 0", fontSize: 13.5, lineHeight: 1.55, color: "var(--navy-soft)" }}>
              Please don&apos;t send sensitive personal details by email — ordinary email is not a
              secure channel. Share only what you need to, and we&apos;ll arrange a secure way to
              talk.
            </p>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 18, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="compass" size={20} stroke="var(--teal)" /> Where we work
            </h2>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)" }}>
              {brand.location}. All sessions are delivered online by secure video, so you can access
              support from anywhere in the UK.
            </p>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 18, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="users" size={20} stroke="var(--teal)" /> Who we support
            </h2>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)" }}>
              {brand.audienceLine} We do not currently provide services to under-18s.
            </p>
          </div>
        </div>
      </div>

      <h2 style={{ margin: "52px 0 6px", fontSize: 26, fontWeight: 800, color: "var(--navy)" }}>
        Where else you can turn
      </h2>
      <p style={{ margin: "0 0 26px", fontSize: 15.5, lineHeight: 1.6, color: "var(--ink)", maxWidth: 700 }}>
        If what you need sits outside what ThrivSphere offers, these organisations can help. We will
        always help you find the right support — signposting is part of what we do.
      </p>
      <SignpostList />
    </PageShell>
  );
}
