/**
 * Rules governing what a safeguarding record must contain.
 *
 * Pure and tested, because these are the checks that make a record defensible
 * months later when someone asks what was known and what was done about it.
 * A form that accepts a high-risk concern with no recorded action produces a
 * record that is worse than useless.
 */

export const CONCERN_CATEGORIES = [
  "adult_safeguarding",
  "domestic_abuse",
  "suicide_self_harm",
  "immediate_danger",
  "child_at_risk",
  "other",
] as const;

export const RISK_LEVELS = ["low", "medium", "high", "immediate"] as const;

export type ConcernCategory = (typeof CONCERN_CATEGORIES)[number];
export type RiskLevel = (typeof RISK_LEVELS)[number];

export type ConcernInput = {
  category: string;
  level: string;
  detail: string;
  immediateAction?: string;
  clientInformed: boolean;
  consentToShare?: boolean | null;
  sharedWithoutConsentReason?: string;
};

export type ValidationErrors = Record<string, string>;

/**
 * Validate a new concern.
 *
 * Three rules beyond the obvious:
 *  - A high or immediate concern must record what was actually done. "We knew
 *    and did nothing recordable" is the finding no service wants.
 *  - Information shared without consent must carry a reason. Sharing without
 *    consent is lawful in the right circumstances, but only if the
 *    justification is written down at the time.
 *  - A child-at-risk concern must say what action was taken regardless of
 *    level, because it falls outside ThrivSphere's adults-only remit and
 *    always needs referring on.
 */
export function validateConcern(input: ConcernInput): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!CONCERN_CATEGORIES.includes(input.category as ConcernCategory)) {
    errors.category = "Please choose a category.";
  }
  if (!RISK_LEVELS.includes(input.level as RiskLevel)) {
    errors.level = "Please choose a risk level.";
  }

  const detail = input.detail?.trim() ?? "";
  if (detail.length < 10) {
    errors.detail = "Please describe the concern — what was said or observed.";
  } else if (detail.length > 20000) {
    errors.detail = "That's too long for one entry.";
  }

  const action = input.immediateAction?.trim() ?? "";
  const needsAction =
    input.level === "high" ||
    input.level === "immediate" ||
    input.category === "child_at_risk" ||
    input.category === "immediate_danger";

  if (needsAction && action.length < 5) {
    errors.immediateAction = "Record what you did — this concern requires an action.";
  }

  if (input.consentToShare === false && !input.sharedWithoutConsentReason?.trim()) {
    errors.sharedWithoutConsentReason =
      "If information is shared without consent, the reason must be recorded.";
  }

  return errors;
}

/**
 * Whether the person entering this should be shown crisis guidance now.
 *
 * This tool gets used while someone is still on a call. If the concern is
 * about life-threatening risk, the emergency numbers belong on screen at that
 * moment, not in a policy document.
 */
export function shouldShowCrisisGuidance(category: string, level: string): boolean {
  return (
    category === "suicide_self_harm" ||
    category === "immediate_danger" ||
    level === "immediate"
  );
}

/**
 * Whether a concern should also raise a standing flag on the record.
 *
 * A concern is an event; a flag is a state a practitioner sees before the next
 * session starts. Anything medium or above carries forward.
 */
export function shouldRaiseRiskFlag(level: string): boolean {
  return level === "medium" || level === "high" || level === "immediate";
}

/** Human-readable category label. */
export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    adult_safeguarding: "Adult safeguarding",
    domestic_abuse: "Domestic abuse",
    suicide_self_harm: "Suicide or self-harm",
    immediate_danger: "Immediate danger",
    child_at_risk: "Child at risk",
    other: "Other",
  };
  return labels[category] ?? category;
}
