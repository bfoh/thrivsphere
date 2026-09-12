"use client";

import Image from "next/image";
import { Section } from "../Section";
import { Icon } from "../icons";
import { PillButton } from "../PillButton";
import { FancyHeadline } from "../FancyHeadline";
import { EnquiryForm } from "../EnquiryForm";
import { NotCrisisNotice } from "../NotCrisisNotice";
import { impact } from "@/data/site";

const GOLD = "#bd951f";
const TEAL = "#3d8a8a";
const NAVY = "#1f3a5f";

export function Support() {
  return (
    <Section
      id="support"
      aura="warm"
      watermark="Contact"
      background="linear-gradient(135deg,#faf9f6 0%,#eef5f2 100%)"
      bleed={
        <div className="bleed-right">
          <Image
            src="/images/people/support-woman.png"
            alt="A warm, reassuring ThrivSphere wellbeing practitioner"
            width={643}
            height={737}
            sizes="(max-width: 900px) 1px, 50vw"
            style={{ height: "100%", width: "auto", objectFit: "contain", objectPosition: "top", filter: "drop-shadow(-16px 22px 26px rgba(31,58,95,0.2))" }}
          />
        </div>
      }
    >
      <div style={{ maxWidth: 620, width: "100%", alignSelf: "flex-start", marginRight: "auto", position: "relative", zIndex: 1 }}>
      <FancyHeadline
        lines={[
          [{ t: "start your", size: 16, italic: true, color: GOLD }],
          [{ t: "JOURNEY", size: 50, weight: 800, color: NAVY }],
          [
            { t: "reach out", size: 18, italic: true, color: TEAL },
            { t: "TODAY", size: 30, weight: 800, color: NAVY },
          ],
        ]}
      />
      <p style={{ margin: "14px 0 0", fontSize: 17, lineHeight: 1.6, maxWidth: 640, color: "var(--ink)" }}>
        Reach out in confidence. Tell us a little about what you&apos;re looking for and we&apos;ll be
        in touch to arrange your session.
      </p>

      <div className="support-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 24, marginTop: 32 }}>
        <EnquiryForm />

        {/* right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="heart" size={20} stroke="var(--gold)" /> Support the CIC
            </h3>
            <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.55, color: "var(--ink)" }}>
              As a Community Interest Company, every donation helps us keep wellbeing support
              accessible to the people who need it most. Get in touch and we&apos;ll tell you how.
            </p>
            <PillButton variant="teal" size="sm" href="/contact" icon="heart">
              Ask about donating
            </PillButton>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="mail" size={20} stroke="var(--teal)" /> Wellbeing newsletter
            </h3>
            <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.55, color: "var(--ink)" }}>
              New guides, exercises and webinar invitations. Message us and we&apos;ll add you to
              the list — you can unsubscribe whenever you like.
            </p>
            <PillButton variant="gold" size="sm" href="/contact" icon="arrow">
              Join the list
            </PillButton>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="shield" size={20} stroke="var(--teal)" /> Where else you can turn
            </h3>
            <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.55, color: "var(--ink)" }}>
              If your needs fall outside what we offer, we&apos;ll help you find the right support.
            </p>
            <PillButton variant="ghost" size="sm" href="/contact#signposting" icon="arrow">
              See the directory
            </PillButton>
          </div>
        </div>
      </div>

      <NotCrisisNotice style={{ marginTop: 30 }} />

      {/* impact row */}
      <div className="impact-row" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginTop: 34 }}>
        {impact.map((i) => (
          <div key={i.label} style={{ textAlign: "center", padding: "16px 10px", background: "#fff", borderRadius: 14, border: "1px solid rgba(31,58,95,0.08)" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--teal-deep)" }}>{i.stat}</div>
            <div style={{ fontSize: 12.5, color: "var(--navy-soft)", marginTop: 4 }}>{i.label}</div>
          </div>
        ))}
      </div>
      </div>
    </Section>
  );
}
