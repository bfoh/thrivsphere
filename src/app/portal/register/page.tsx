import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/session";
import { getOnboardingState } from "@/lib/onboarding";
import { AgeGateForm, IntakeForm, ConsentForm } from "@/components/portal/RegisterForms";

export const metadata: Metadata = {
  title: "Register",
  robots: { index: false, follow: false },
};

const STEPS = [
  { key: "age", label: "About you" },
  { key: "intake", label: "What brings you here" },
  { key: "consent", label: "Consent" },
] as const;

/**
 * Registration.
 *
 * The current step is derived from the record, not held in the session or a
 * URL parameter, so the age gate cannot be stepped past by navigating
 * directly and a half-finished registration survives a closed browser.
 */
export default async function RegisterPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  const state = await getOnboardingState(actor.userId);
  if (state.step === "complete") redirect("/portal");

  const currentIndex = STEPS.findIndex((s) => s.key === state.step);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 72px" }}>
      <ol
        style={{
          display: "flex",
          gap: 10,
          listStyle: "none",
          margin: "0 0 26px",
          padding: 0,
          flexWrap: "wrap",
        }}
      >
        {STEPS.map((s, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li
              key={s.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: active ? 800 : 600,
                color: active ? "var(--teal-deep)" : done ? "var(--navy)" : "var(--navy-soft)",
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: done || active ? "#fff" : "var(--navy-soft)",
                  background: done
                    ? "var(--grad-teal)"
                    : active
                      ? "var(--grad-gold)"
                      : "rgba(31,58,95,0.1)",
                }}
              >
                {i + 1}
              </span>
              {s.label}
            </li>
          );
        })}
      </ol>

      <h1 style={{ margin: "0 0 8px", fontSize: "clamp(23px,4.6vw,30px)", fontWeight: 800, color: "var(--navy)" }}>
        {state.step === "age" && "First, a little about you"}
        {state.step === "intake" && "What brings you to ThrivSphere?"}
        {state.step === "consent" && "Before we begin"}
      </h1>
      <p style={{ margin: "0 0 24px", fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
        {state.step === "age" &&
          "ThrivSphere supports adults aged 18 and over, women and men. This takes a minute."}
        {state.step === "intake" &&
          "This helps us understand how best to support you — and to be honest with you if we're not the right fit."}
        {state.step === "consent" &&
          "So you know exactly what you're agreeing to, and what we can and cannot offer."}
      </p>

      {state.step === "age" && <AgeGateForm />}
      {state.step === "intake" && <IntakeForm />}
      {state.step === "consent" && <ConsentForm />}
    </div>
  );
}
