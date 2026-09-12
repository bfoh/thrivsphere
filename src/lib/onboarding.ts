import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, consents, intakeSubmissions } from "@/db/schema";

export { isAdult } from "./age";

/** Question-set version recorded against every intake submission. */
export const INTAKE_VERSION = "intake-v1";

/**
 * Consents required before a first session can be booked.
 *
 * `age_18_plus` is captured at the gate; the rest are accepted together on the
 * consent step. Each is stored against the policy version on screen at the
 * time, so a later policy change can require re-consent.
 */
export const REQUIRED_CONSENTS = [
  { type: "terms" as const, policySlug: "terms" },
  { type: "privacy" as const, policySlug: "privacy" },
  { type: "confidentiality_limits" as const, policySlug: "confidentiality" },
  { type: "consent_to_support" as const, policySlug: "consent" },
];

export type OnboardingStep = "age" | "intake" | "consent" | "complete";

export type OnboardingState = {
  clientId: string | null;
  step: OnboardingStep;
  preferredName: string | null;
};

/**
 * Where this person is in registration.
 *
 * Derived from the record rather than tracked in a session, so a half-finished
 * registration survives closing the browser, and so the age gate cannot be
 * skipped by navigating straight to a later step.
 */
export async function getOnboardingState(userId: string): Promise<OnboardingState> {
  const db = getDb();

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, userId))
    .limit(1);

  // No record yet, or the adult confirmation was never completed.
  if (!client || !client.confirmedAdult) {
    return {
      clientId: client?.id ?? null,
      step: "age",
      preferredName: client?.preferredName ?? null,
    };
  }

  const [intake] = await db
    .select({ id: intakeSubmissions.id })
    .from(intakeSubmissions)
    .where(eq(intakeSubmissions.clientId, client.id))
    .limit(1);

  if (!intake) {
    return { clientId: client.id, step: "intake", preferredName: client.preferredName };
  }

  // Live consents only — a withdrawn consent sends them back to this step.
  const granted = await db
    .select({ type: consents.type })
    .from(consents)
    .where(
      and(
        eq(consents.clientId, client.id),
        eq(consents.granted, true),
        isNull(consents.withdrawnAt)
      )
    );

  const have = new Set(granted.map((g) => g.type));
  const missing = REQUIRED_CONSENTS.filter((c) => !have.has(c.type));

  return {
    clientId: client.id,
    step: missing.length ? "consent" : "complete",
    preferredName: client.preferredName,
  };
}
