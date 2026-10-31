"use client";

import { Section } from "../Section";
import { PillButton } from "../PillButton";
import { FancyHeadline } from "../FancyHeadline";
import { TeamCard } from "../TeamCard";
import { team } from "@/data/site";

const GOLD = "#bd951f";
const TEAL = "#3d8a8a";
const NAVY = "#1f3a5f";

export function Team() {
  return (
    <Section id="team" aura="warm" watermark="Team">
      <FancyHeadline
        lines={[
          [{ t: "meet our", size: 16, italic: true, color: GOLD }],
          [{ t: "TEAM", size: 52, weight: 800, color: NAVY }],
          [
            { t: "registered", size: 18, italic: true, color: TEAL },
            { t: "MENTAL HEALTH NURSES", size: 24, weight: 800, color: NAVY },
          ],
        ]}
      />
      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, marginTop: 30, alignItems: "stretch" }}>
        {team.map((m) => (
          <TeamCard key={m.slug} member={m} />
        ))}
      </div>
      <div className="cta-stack" style={{ marginTop: 28, display: "flex" }}>
        <PillButton variant="teal" size="md" href="/team" icon="arrow">
          Meet Our Team
        </PillButton>
      </div>
    </Section>
  );
}
