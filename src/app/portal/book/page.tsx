import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/session";
import { getOnboardingState } from "@/lib/onboarding";
import { getBookableSlots, getDefaultPractitioner } from "@/lib/queries/availability";
import { SlotPicker } from "@/components/portal/SlotPicker";
import { NotCrisisNotice } from "@/components/NotCrisisNotice";

export const metadata: Metadata = { title: "Book a session", robots: { index: false, follow: false } };

const DURATION = 50;
const LDN = "Europe/London";

export default async function BookPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  // Registration, including the 18+ gate and consent, must be finished first.
  const state = await getOnboardingState(actor.userId);
  if (state.step !== "complete") redirect("/portal/register");

  const practitioner = await getDefaultPractitioner();
  const slots = practitioner
    ? await getBookableSlots({ practitionerId: practitioner.id, durationMinutes: DURATION, days: 28 })
    : [];

  const groups = Object.values(
    slots.reduce<Record<string, { date: string; label: string; slots: { iso: string; time: string }[] }>>(
      (acc, s) => {
        const date = new Intl.DateTimeFormat("en-CA", { timeZone: LDN }).format(s.startsAt);
        acc[date] ??= {
          date,
          label: s.startsAt.toLocaleDateString("en-GB", {
            timeZone: LDN, weekday: "long", day: "numeric", month: "long",
          }),
          slots: [],
        };
        acc[date].slots.push({
          iso: s.startsAt.toISOString(),
          time: s.startsAt.toLocaleTimeString("en-GB", {
            timeZone: LDN, hour: "2-digit", minute: "2-digit",
          }),
        });
        return acc;
      },
      {}
    )
  );

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 72px" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: "clamp(24px,4.6vw,30px)", fontWeight: 800, color: "var(--navy)" }}>
        Book a session
      </h1>
      <p style={{ margin: "0 0 26px", fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
        Sessions are {DURATION} minutes, online. Times are shown in UK time. Your joining link
        appears here in your account — we never send it by email.
      </p>

      {groups.length === 0 ? (
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 19, color: "var(--navy)" }}>No times available yet</h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
            There are no bookable slots at the moment. Please contact us and we&apos;ll arrange a
            time with you directly.
          </p>
        </div>
      ) : (
        <SlotPicker groups={groups} durationMinutes={DURATION} />
      )}

      <NotCrisisNotice style={{ marginTop: 30 }} />
    </div>
  );
}
