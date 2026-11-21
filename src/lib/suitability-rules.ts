/**
 * Suitability after the Initial Wellbeing Consultation (IT handover §13.1).
 *
 * In the paid consultation the practitioner carries out the Wellbeing Needs
 * Review and records one of three outcomes, with a rationale. Only Suitable
 * opens booking for ongoing sessions, and nothing opens it automatically:
 * "Do not automatically open ongoing-session booking for clients found
 * unsuitable" (§13.1); "ongoing sessions are not enabled automatically"
 * (§13.8).
 *
 * Pure rules, so they can be tested without a database.
 */

export type SuitabilityOutcome = "suitable" | "clarification" | "not_suitable";

/** The three outcomes, worded as the handover words them. */
export const SUITABILITY_OUTCOMES: { value: SuitabilityOutcome; label: string; hint: string }[] = [
  {
    value: "suitable",
    label: "Suitable",
    hint: "Within ThriveSphere's non-clinical remit. Opens booking for ongoing sessions.",
  },
  {
    value: "clarification",
    label: "Clarification or further support needed",
    hint: "Not decided yet. Sessions stay closed until a further decision.",
  },
  {
    value: "not_suitable",
    label: "Not suitable — signpost",
    hint: "Outside the remit. Record where you signposted them; sessions stay closed.",
  },
];

export function outcomeLabel(outcome: string): string {
  return SUITABILITY_OUTCOMES.find((o) => o.value === outcome)?.label ?? outcome;
}

export function isOutcome(v: string): v is SuitabilityOutcome {
  return SUITABILITY_OUTCOMES.some((o) => o.value === v);
}

export type SessionGate = { open: true } | { open: false; message: string };

/**
 * Whether the client may book or buy ongoing sessions, from their latest
 * decision. No decision yet means the consultation has not happened or its
 * outcome is not recorded, so sessions stay closed.
 */
export function sessionGate(latest: SuitabilityOutcome | null): SessionGate {
  switch (latest) {
    case "suitable":
      return { open: true };
    case "clarification":
      return {
        open: false,
        message:
          "Your practitioner will be in touch about next steps. Ongoing sessions can be booked once they have confirmed them.",
      };
    case "not_suitable":
      return {
        open: false,
        message:
          "Ongoing sessions aren't available on your account. If you have questions, please send us a message.",
      };
    default:
      return {
        open: false,
        message:
          "Ongoing sessions can be booked once your practitioner has confirmed next steps in your Initial Wellbeing Consultation.",
      };
  }
}

export type DecisionInput = { outcome: string; rationale: string; signpostedTo: string };

export type ParsedDecision =
  | { ok: true; value: { outcome: SuitabilityOutcome; rationale: string; signpostedTo: string | null } }
  | { ok: false; fieldErrors: Record<string, string> };

/** Check a decision before it is saved. */
export function parseDecision(input: DecisionInput): ParsedDecision {
  const outcome = input.outcome.trim();
  const rationale = input.rationale.trim();
  const signpostedTo = input.signpostedTo.trim();
  const fieldErrors: Record<string, string> = {};

  if (!isOutcome(outcome)) fieldErrors.outcome = "Choose an outcome.";
  if (rationale.length < 10) fieldErrors.rationale = "Give the reason for the decision in a sentence or two.";
  else if (rationale.length > 2000) fieldErrors.rationale = "Please keep this under 2,000 characters.";
  if (outcome === "not_suitable") {
    if (signpostedTo.length < 2) fieldErrors.signpostedTo = "Name the service you signposted them to.";
    else if (signpostedTo.length > 200) fieldErrors.signpostedTo = "Please keep this under 200 characters.";
  }

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  return {
    ok: true,
    value: {
      outcome: outcome as SuitabilityOutcome,
      rationale,
      signpostedTo: outcome === "not_suitable" ? signpostedTo : null,
    },
  };
}

/**
 * Whether a client is waiting for an outcome: they have had their initial
 * consultation and no decision has been recorded since it.
 */
export function outcomeDue(params: { consultationCompletedAt: Date | null; latestDecisionAt: Date | null }): boolean {
  const { consultationCompletedAt, latestDecisionAt } = params;
  if (!consultationCompletedAt) return false;
  return !latestDecisionAt || latestDecisionAt < consultationCompletedAt;
}
