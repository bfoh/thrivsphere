import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { ScopeOfPractice } from "@/components/ScopeOfPractice";
import { ServiceDetail } from "@/components/ServiceDetail";
import { Icon } from "@/components/icons";
import { bookCta, brand } from "@/data/site";
import { getPublishedServices } from "@/lib/queries/catalogue";

export const metadata: Metadata = {
  title: "Our Services",
  description:
    "Wellbeing Needs Reviews, emotional wellbeing support, psychoeducation and coping skills, resilience and personal development, and workplace wellbeing — online, for adults aged 18 and above.",
};

// See src/app/page.tsx.
export const revalidate = 300;

export default async function ServicesPage() {
  const services = await getPublishedServices();
  return (
    <PageShell
      eyebrow="Our Services"
      watermark="Services"
      title="Our services"
      intro={`${brand.positioning} ${brand.audienceLine}`}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {services.map((s, i) => (
          <ServiceDetail key={s.slug} service={s} letter={String.fromCharCode(65 + i)} />
        ))}
      </div>

      <div style={{ marginTop: 48 }}>
        <ScopeOfPractice />
      </div>

      <div
        style={{
          marginTop: 40,
          textAlign: "center",
          background: "linear-gradient(135deg,#f2f6ee,#e6efe1)",
          borderRadius: 18,
          padding: "34px 24px",
        }}
      >
        <h2 style={{ margin: "0 0 8px", fontSize: 22, color: "var(--navy)" }}>Where to start</h2>
        <p style={{ margin: "0 auto 18px", maxWidth: 560, fontSize: 15, lineHeight: 1.55, color: "var(--ink)" }}>
          Support begins with an Initial Wellbeing Needs Review — a 50-minute online conversation
          exploring concerns, coping strategies, strengths and personal wellbeing goals.{" "}
          <Link href="/how-it-works" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
            How it works
          </Link>
          .
        </p>
        <Link href={bookCta.href} className="pill pill-gold" style={{ padding: "13px 26px", fontSize: 14.5 }}>
          {bookCta.label} <Icon name="arrow" size={16} />
        </Link>
      </div>
    </PageShell>
  );
}
