/**
 * The Safeguarding Incident / Concern Record: its options, in the form's own
 * words, and the checks that make a completed record defensible later.
 *
 * Source: ThriveSphere's form, sent by the owner on 21 November 2026. It is
 * completed when the Safeguarding & Safety Escalation Procedure has been
 * activated. It documents the concern, decisions and actions taken; it is not
 * a clinical risk assessment, and there is deliberately no risk score.
 *
 * Pure and tested. Ticked options are stored as the keys below.
 */

type Option = { key: string; label: string };

const keysOf = (o: readonly Option[]) => o.map((x) => x.key);

/** 2. How did the concern arise? */
export const AROSE = [
  { key: "client_disclosure", label: "Client disclosure" },
  { key: "practitioner_observation", label: "Practitioner observation" },
  { key: "another_source", label: "Information from another source" },
  { key: "other", label: "Other" },
] as const satisfies readonly Option[];

/** 2. Type of concern. */
export const CONCERN_TYPES = [
  { key: "harm_to_self", label: "Harm or potential harm to self" },
  { key: "harm_to_another", label: "Potential serious harm to another person" },
  { key: "harm_from_another", label: "Harm, abuse, neglect or exploitation from another person" },
  { key: "domestic_abuse", label: "Domestic abuse / coercive control" },
  { key: "deterioration", label: "Serious deterioration in wellbeing" },
  { key: "medical", label: "Serious medical concern" },
  { key: "other", label: "Other serious safety concern" },
] as const satisfies readonly Option[];

/** 3. Did there appear to be an immediate threat to life or serious harm? */
export const IMMEDIATE_THREAT = [
  { key: "no", label: "No" },
  { key: "yes", label: "Yes" },
  { key: "unclear", label: "Unclear" },
] as const satisfies readonly Option[];

/** 4. Action agreed with the client. */
export const AGREED_ACTIONS = [
  { key: "trusted_person", label: "Client to contact trusted person/emergency contact" },
  { key: "doctor", label: "Client to contact Medical Doctor/healthcare professional" },
  { key: "existing_professional", label: "Client to contact existing mental health professional/service" },
  { key: "local_support", label: "Client to contact appropriate local support/service" },
  { key: "safer_place", label: "Client to move to/remain somewhere safer" },
  { key: "safety_plan", label: "Client to use existing personal safety plan" },
  { key: "signposting", label: "Signposting/information provided" },
  { key: "other", label: "Other" },
] as const satisfies readonly Option[];

/** 5. Client agreed to involvement. */
export const CLIENT_AGREEMENT = [
  { key: "yes", label: "Yes" },
  { key: "no", label: "No" },
  { key: "not_applicable", label: "Not applicable" },
] as const satisfies readonly Option[];

/** 7. Discussed with. */
export const DISCUSSED_WITH = [
  { key: "lead", label: "Safeguarding Lead – Patience" },
  { key: "deputy", label: "Deputy Safeguarding Lead – Lucy" },
] as const satisfies readonly Option[];

/** 8. ThriveSphere next step. */
export const NEXT_STEPS = [
  { key: "continue", label: "Continue normal wellbeing support" },
  { key: "alongside", label: "Continue alongside additional professional support" },
  { key: "pause", label: "Temporarily pause while urgent/specialist support is accessed" },
  { key: "review", label: "Review with Safeguarding Lead/Deputy before next session" },
  { key: "other", label: "Other" },
] as const satisfies readonly Option[];

export const RECORDING_REMINDER = [
  "Record facts, relevant observations, the client's own words where important, decisions made, actions taken and the reasons for those actions.",
  "Avoid speculation, judgemental language, unnecessary clinical terminology and risk scoring.",
  "Record the concern at the time or as soon as reasonably possible afterwards and store the record securely.",
];

export type ImmediateThreat = (typeof IMMEDIATE_THREAT)[number]["key"];
export type ClientAgreement = (typeof CLIENT_AGREEMENT)[number]["key"];

/** The label for a stored key, or the key itself if it's unknown. */
export function labelFor(options: readonly Option[], key: string): string {
  return options.find((o) => o.key === key)?.label ?? key;
}

/** Ticked options as their labels, with the "Other" text in place of "Other". */
export function labelsFor(options: readonly Option[], keys: readonly string[], other?: string | null): string[] {
  return keys.map((k) => (k === "other" && other ? `${labelFor(options, k)}: ${other}` : labelFor(options, k)));
}

// ---------------------------------------------------------------------------
// Reading the form

export type ConcernRecord = {
  occurredAt: Date;
  practitionerId: string;
  clientLocation: string | null;
  arose: string[];
  aroseOther: string | null;
  concernTypes: string[];
  concernTypeOther: string | null;
  detail: string;
  immediateThreat: ImmediateThreat;
  immediateThreatInfo: string;
  clientWishes: string | null;
  agreedActions: string[];
  agreedActionOther: string | null;
  agreedActionDetails: string | null;
  trustedPersonRequired: boolean;
  trustedPersonAgreed: ClientAgreement | null;
  trustedPersonContacted: string | null;
  trustedPersonOutcome: string | null;
  externalContacted: boolean;
  escalatedTo: string | null;
  escalatedAt: Date | null;
  informationShared: string | null;
  sharingReason: string | null;
  sharingClientInformed: boolean | null;
  sharedWithoutConsentReason: string | null;
  discussedInternally: boolean;
  discussedWith: string[];
  discussedAt: Date | null;
  internalAdvice: string | null;
  contactOutcome: string | null;
  nextSteps: string[];
  nextStepOther: string | null;
  followUpAction: string | null;
  followUpBy: string | null;
  followUpDate: string | null;
  additionalInfo: string | null;
  initials: string;
};

export type ValidationErrors = Record<string, string>;

type Reader = { get: (name: string) => string; getAll: (name: string) => string[] };

const MAX_TEXT = 20_000;
const MAX_SHORT = 300;

/** A date and time typed as UK local time ("2026-11-21" + "14:05"). */
export function londonDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  if (mo < 1 || mo > 12 || d < 1 || h > 23 || mi > 59) return null;
  // Dates that don't exist (31 February) would roll over into the next month.
  // Find the UTC instant whose London wall-clock time is the one typed.
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  if (new Date(guess).getUTCMonth() !== mo - 1 || new Date(guess).getUTCDate() !== d) return null;
  const out = new Date(guess - (londonWallClock(new Date(guess)) - guess));
  // A time skipped when the clocks go forward has no answer.
  return londonWallClock(out) === guess ? out : null;
}

/** The London wall-clock time of an instant, as if it were UTC (milliseconds). */
function londonWallClock(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"));
}

/**
 * Read and check a completed record.
 *
 * What must be filled in: when it happened and who the practitioner was; how
 * it arose and what kind of concern; what happened; the immediate-safety
 * answer and the information behind it; whether a trusted person, an external
 * service or the Safeguarding Lead/Deputy were involved (and, if so, the
 * details that make that defensible); at least one next step; initials.
 * Everything else on the form is recorded if given.
 */
export function parseConcernRecord(r: Reader, now = new Date()): { ok: true; record: ConcernRecord } | { ok: false; errors: ValidationErrors } {
  const errors: ValidationErrors = {};
  const text = (name: string, max = MAX_TEXT) => {
    const v = r.get(name).trim();
    if (v.length > max) errors[name] = "That's too long.";
    return v || null;
  };
  const ticked = (name: string, options: readonly Option[]) => {
    const allowed = keysOf(options);
    return [...new Set(r.getAll(name))].filter((k) => allowed.includes(k));
  };
  const yesNo = (name: string, message: string) => {
    const v = r.get(name);
    if (v !== "yes" && v !== "no") errors[name] = message;
    return v === "yes";
  };
  const when = (dateName: string, timeName: string, label: string, required: boolean) => {
    const date = r.get(dateName).trim();
    const time = r.get(timeName).trim();
    if (!date && !time) {
      if (required) errors[dateName] = `Enter the ${label}.`;
      return null;
    }
    const at = londonDateTime(date, time);
    if (!at) errors[dateName] = `Enter the ${label} as a date and a time.`;
    else if (at.getTime() > now.getTime() + 5 * 60_000) errors[dateName] = `The ${label} can't be in the future.`;
    return at;
  };

  // 1.
  const occurredAt = when("occurredDate", "occurredTime", "date and time", true);
  const practitionerId = r.get("practitionerId").trim();
  if (!/^[0-9a-f-]{36}$/.test(practitionerId)) errors.practitionerId = "Choose the wellbeing practitioner.";
  const clientLocation = text("clientLocation", MAX_SHORT);

  // 2.
  const arose = ticked("arose", AROSE);
  const aroseOther = text("aroseOther", MAX_SHORT);
  if (arose.length === 0) errors.arose = "Tick how the concern arose.";
  else if (arose.includes("other") && !aroseOther) errors.aroseOther = "Say how the concern arose.";
  const concernTypes = ticked("concernTypes", CONCERN_TYPES);
  const concernTypeOther = text("concernTypeOther", MAX_SHORT);
  if (concernTypes.length === 0) errors.concernTypes = "Tick the type of concern.";
  else if (concernTypes.includes("other") && !concernTypeOther) errors.concernTypeOther = "Describe the other safety concern.";
  const detail = text("detail") ?? "";
  if (detail.length < 10) errors.detail = "Record what happened or was disclosed.";

  // 3.
  const threat = r.get("immediateThreat");
  if (!keysOf(IMMEDIATE_THREAT).includes(threat)) errors.immediateThreat = "Answer whether there appeared to be an immediate threat.";
  const immediateThreatInfo = text("immediateThreatInfo") ?? "";
  if (immediateThreatInfo.length < 5) errors.immediateThreatInfo = "Record the information you used to make this decision.";

  // 4.
  const clientWishes = text("clientWishes");
  const agreedActions = ticked("agreedActions", AGREED_ACTIONS);
  const agreedActionOther = text("agreedActionOther", MAX_SHORT);
  if (agreedActions.includes("other") && !agreedActionOther) errors.agreedActionOther = "Say what the other agreed action is.";
  const agreedActionDetails = text("agreedActionDetails");

  // 5.
  const trustedPersonRequired = yesNo("trustedPersonRequired", "Answer whether a trusted person's involvement was required.");
  const agreed = r.get("trustedPersonAgreed");
  let trustedPersonAgreed: ClientAgreement | null = null;
  if (trustedPersonRequired) {
    if (keysOf(CLIENT_AGREEMENT).includes(agreed)) trustedPersonAgreed = agreed as ClientAgreement;
    else errors.trustedPersonAgreed = "Answer whether the client agreed to involvement.";
  }
  const trustedPersonContacted = trustedPersonRequired ? text("trustedPersonContacted", MAX_SHORT) : null;
  const trustedPersonOutcome = trustedPersonRequired ? text("trustedPersonOutcome") : null;

  // 6.
  const externalContacted = yesNo("externalContacted", "Answer whether an external service was contacted.");
  let escalatedTo: string | null = null;
  let escalatedAt: Date | null = null;
  let informationShared: string | null = null;
  let sharingReason: string | null = null;
  let sharingClientInformed: boolean | null = null;
  let sharedWithoutConsentReason: string | null = null;
  if (externalContacted) {
    escalatedTo = text("escalatedTo", MAX_SHORT);
    if (!escalatedTo) errors.escalatedTo = "Name the service or person contacted.";
    escalatedAt = when("escalatedDate", "escalatedTime", "date and time they were contacted", true);
    informationShared = text("informationShared");
    if (!informationShared) errors.informationShared = "Record what information was shared.";
    sharingReason = text("sharingReason");
    if (!sharingReason) errors.sharingReason = "Record the reason for sharing.";
    sharingClientInformed = yesNo("sharingClientInformed", "Answer whether the client was informed.");
    sharedWithoutConsentReason = text("sharedWithoutConsentReason");
  }

  // 7.
  const discussedInternally = yesNo("discussedInternally", "Answer whether the concern was discussed internally.");
  let discussedWith: string[] = [];
  let discussedAt: Date | null = null;
  let internalAdvice: string | null = null;
  if (discussedInternally) {
    discussedWith = ticked("discussedWith", DISCUSSED_WITH);
    if (discussedWith.length === 0) errors.discussedWith = "Tick who it was discussed with.";
    discussedAt = when("discussedDate", "discussedTime", "date and time it was discussed", true);
    internalAdvice = text("internalAdvice");
  }

  // 8.
  const contactOutcome = text("contactOutcome");
  const nextSteps = ticked("nextSteps", NEXT_STEPS);
  const nextStepOther = text("nextStepOther", MAX_SHORT);
  if (nextSteps.length === 0) errors.nextSteps = "Tick ThriveSphere's next step.";
  else if (nextSteps.includes("other") && !nextStepOther) errors.nextStepOther = "Say what the other next step is.";
  const followUpAction = text("followUpAction");
  const followUpBy = text("followUpBy", MAX_SHORT);
  if (followUpAction && !followUpBy) errors.followUpBy = "Say who is responsible for the follow-up.";
  const followUpDate = r.get("followUpDate").trim() || null;
  if (followUpDate && !/^\d{4}-\d{2}-\d{2}$/.test(followUpDate)) errors.followUpDate = "Enter the follow-up date as a date.";

  // 9.
  const additionalInfo = text("additionalInfo");
  const initials = (text("initials", 12) ?? "").trim();
  if (initials.length < 1) errors.initials = "Add your initials.";

  if (Object.keys(errors).length || !occurredAt) return { ok: false, errors };
  return {
    ok: true,
    record: {
      occurredAt,
      practitionerId,
      clientLocation,
      arose,
      aroseOther: arose.includes("other") ? aroseOther : null,
      concernTypes,
      concernTypeOther: concernTypes.includes("other") ? concernTypeOther : null,
      detail,
      immediateThreat: threat as ImmediateThreat,
      immediateThreatInfo,
      clientWishes,
      agreedActions,
      agreedActionOther: agreedActions.includes("other") ? agreedActionOther : null,
      agreedActionDetails,
      trustedPersonRequired,
      trustedPersonAgreed,
      trustedPersonContacted,
      trustedPersonOutcome,
      externalContacted,
      escalatedTo,
      escalatedAt,
      informationShared,
      sharingReason,
      sharingClientInformed,
      sharedWithoutConsentReason,
      discussedInternally,
      discussedWith,
      discussedAt,
      internalAdvice,
      contactOutcome,
      nextSteps,
      nextStepOther: nextSteps.includes("other") ? nextStepOther : null,
      followUpAction,
      followUpBy,
      followUpDate,
      additionalInfo,
      initials,
    },
  };
}

// ---------------------------------------------------------------------------
// What a record sets in motion

/**
 * Whether the crisis numbers should be on screen while the form is filled in.
 * It may be completed while someone is still on a call.
 */
export function shouldShowCrisisGuidance(concernTypes: readonly string[], immediateThreat: string): boolean {
  return (
    immediateThreat === "yes" ||
    immediateThreat === "unclear" ||
    concernTypes.includes("harm_to_self") ||
    concernTypes.includes("harm_to_another")
  );
}

/**
 * Why a record puts a safeguarding flag on the client's record, or null.
 *
 * The owner's decision (21 November 2026): a flag when immediate safety was
 * "Yes" or "Unclear", or when the next step is a review with the Safeguarding
 * Lead/Deputy before the next session. It stays until the founder or the
 * Deputy Safeguarding Lead stands it down.
 */
export function flagReason(record: Pick<ConcernRecord, "immediateThreat" | "nextSteps">): string | null {
  const reasons: string[] = [];
  if (record.immediateThreat === "yes") reasons.push("Immediate threat to life or serious harm: Yes");
  if (record.immediateThreat === "unclear") reasons.push("Immediate threat to life or serious harm: Unclear");
  if (record.nextSteps.includes("review")) reasons.push(labelFor(NEXT_STEPS, "review"));
  return reasons.length ? reasons.join(". ") : null;
}

/** Who may stand a flag down: the founder (Safeguarding Lead) or the Deputy. */
export function canStandDownFlag(actor: { role: string; safeguardingDeputy: boolean }): boolean {
  return actor.role === "founder" || actor.safeguardingDeputy;
}

/** The status a new record starts in. */
export function initialStatus(record: Pick<ConcernRecord, "externalContacted">): "open" | "escalated" {
  return record.externalContacted ? "escalated" : "open";
}
