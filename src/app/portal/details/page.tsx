import type { Metadata } from "next";
import { requirePortalClient } from "@/lib/portal-guard";
import { getEmergencyContact } from "@/lib/queries/emergency-contact";
import { EmergencyContactForm } from "@/components/portal/EmergencyContactForm";
import { NotCrisisNotice } from "@/components/NotCrisisNotice";
import { answerLabel } from "@/lib/emergency-contact";

export const metadata: Metadata = { title: "Your details", robots: { index: false, follow: false } };

const when = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });

/**
 * Where a client keeps their Emergency Contact / Next of Kin up to date
 * (IT handover §15.4: "allow authorised updates later from the client
 * profile").
 */
export default async function DetailsPage() {
  const { clientId } = await requirePortalClient();
  const ec = await getEmergencyContact(clientId);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 72px" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: "clamp(24px,4.6vw,30px)", fontWeight: 800, color: "var(--navy)" }}>Your details</h1>
      <p style={{ margin: "0 0 26px", fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
        {ec?.status
          ? `${answerLabel(ec.status)}${ec.updatedAt ? `, last updated ${when(ec.updatedAt)}` : ""}. You can change this at any time.`
          : "You haven't told us about an emergency contact yet."}
      </p>
      <div className="card" style={{ padding: 32 }}>
        <EmergencyContactForm
          from="details"
          values={{
            status: ec?.status ?? null,
            name: ec?.name ?? null,
            relationship: ec?.relationship ?? null,
            phone: ec?.phone ?? null,
            alt: ec?.alt ?? null,
            country: ec?.country ?? null,
            timeZone: ec?.timeZone ?? null,
            method: ec?.method ?? null,
            methodOther: ec?.methodOther ?? null,
            informed: null,
          }}
        />
      </div>
      <NotCrisisNotice style={{ marginTop: 30 }} />
    </div>
  );
}
