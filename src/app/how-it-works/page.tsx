import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { PillButton } from "@/components/PillButton";
import { HowItWorksSteps } from "@/components/HowItWorksSteps";
import { NotCrisisNotice } from "@/components/NotCrisisNotice";
import { bookCta, brand } from "@/data/site";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "How ThriveSphere wellbeing support works: from your enquiry or booking and Initial Wellbeing Needs Review to ongoing support and progress reviews.",
};

export default function HowItWorksPage() {
  return (
    <PageShell
      eyebrow="How It Works"
      watermark="Process"
      title="How our service works"
      intro={brand.availabilityLine}
      aura="sage"
    >
      <HowItWorksSteps />

      <p style={{ margin: "28px 0 0", fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
        See{" "}
        <Link href="/pricing" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
          Pricing and Packages
        </Link>{" "}
        for session prices, or read our{" "}
        <Link href="/faq" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
          frequently asked questions
        </Link>
        .
      </p>

      <NotCrisisNotice style={{ marginTop: 30 }} />

      <div className="cta-stack" style={{ marginTop: 34, display: "flex", gap: 14, flexWrap: "wrap" }}>
        <PillButton variant="gold" size="lg" href={bookCta.href} icon="arrow">
          {bookCta.label}
        </PillButton>
        <PillButton variant="ghost" size="lg" href="/contact">
          Contact Us
        </PillButton>
      </div>
    </PageShell>
  );
}
