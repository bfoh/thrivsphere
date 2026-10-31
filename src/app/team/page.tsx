import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { PillButton } from "@/components/PillButton";
import { TeamProfile } from "@/components/TeamCard";
import { bookCta, team } from "@/data/site";

export const metadata: Metadata = {
  title: "Meet Our Team",
  description:
    "Meet the ThriveSphere Wellbeing practitioners: experienced Registered Mental Health Nurses providing online wellbeing support.",
};

export default function TeamPage() {
  return (
    <PageShell
      eyebrow="Meet Our Team"
      watermark="Team"
      title="Experienced Registered Mental Health Nurses"
      intro="Our practitioners are experienced Registered Mental Health Nurses with professional backgrounds in face-to-face and remote mental health support."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
        {team.map((m) => (
          <TeamProfile key={m.slug} member={m} />
        ))}
      </div>

      <div className="cta-stack" style={{ marginTop: 48, display: "flex", justifyContent: "center" }}>
        <PillButton variant="gold" size="lg" href={bookCta.href} icon="arrow">
          {bookCta.label}
        </PillButton>
      </div>
    </PageShell>
  );
}
