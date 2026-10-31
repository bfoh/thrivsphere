import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { FaqList } from "@/components/FaqList";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about ThriveSphere Wellbeing: who can use the service, our practitioners, sessions, confidentiality and urgent support.",
};

export default function FaqPage() {
  return (
    <PageShell eyebrow="FAQ" watermark="FAQ" title="Frequently asked questions">
      <FaqList />
      <p style={{ margin: "30px 0 0", fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
        Still have a question?{" "}
        <Link href="/contact" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
          Contact us
        </Link>
        .
      </p>
    </PageShell>
  );
}
