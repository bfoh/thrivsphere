/**
 * Discount rules: client concessions, discount codes and free sessions.
 *
 * The reduced price is always worked out here, on the server, from our own
 * records, and that is what is charged at Stripe. So an order's amount is
 * what was actually paid, and refunds (`creditsAfterRefund`), the webhook's
 * amount check and revenue all keep working unchanged.
 *
 * Pure, so it can be tested without a database.
 */
import { addDays, zonedTimeToUtc } from "./time";

/** Stripe cannot take tiny card payments: a price is £0 (free) or at least this. */
export const MIN_CHARGE_PENCE = 100;
/** A code can never make anything free, so a leaked code gives nothing away. */
export const CODE_MAX_PERCENT = 90;
export const DEFAULT_CONCESSION_LABEL = "Concessionary rate";

export type DiscountKind = "client" | "code";

export type DiscountRule = {
  id: string;
  kind: DiscountKind;
  label: string;
  percentOff: number | null;
  amountOffPence: number | null;
  planSlugs: string[] | null;
  maxUses: number | null;
  maxUsesPerClient: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
};

export const DISCOUNT_REASONS = [
  { value: "financial_hardship", label: "Financial hardship" },
  { value: "goodwill", label: "Goodwill" },
  { value: "partner_referral", label: "Partner referral" },
  { value: "other", label: "Other" },
] as const;
export type DiscountReason = (typeof DISCOUNT_REASONS)[number]["value"];

export function reasonLabel(v: string | null | undefined): string {
  return DISCOUNT_REASONS.find((r) => r.value === v)?.label ?? "—";
}

/** The amount taken off a price, before any floor. */
function rawPrice(listPence: number, d: Pick<DiscountRule, "percentOff" | "amountOffPence">): number {
  const off = d.percentOff != null ? Math.round((listPence * d.percentOff) / 100) : (d.amountOffPence ?? 0);
  return Math.max(listPence - off, 0);
}

/**
 * The price after a discount.
 *
 * A concession may make something free (£0, booked without Stripe). A code
 * never does. Anything left between 1p and 99p becomes £1, because Stripe
 * cannot take less; the forms refuse discounts that would do that, so this
 * only matters if a price changes later.
 */
export function priceAfter(
  listPence: number,
  d: Pick<DiscountRule, "kind" | "percentOff" | "amountOffPence">
): number {
  const price = rawPrice(listPence, d);
  if (price === 0 && d.kind === "client") return 0;
  return Math.max(price, Math.min(MIN_CHARGE_PENCE, listPence));
}

/** Whether a discount covers this purchase now (ignoring use limits). */
export function appliesTo(d: DiscountRule, planSlug: string, now: Date): boolean {
  if (!d.active) return false;
  if (d.startsAt && now < d.startsAt) return false;
  if (d.endsAt && now >= d.endsAt) return false;
  return !d.planSlugs || d.planSlugs.includes(planSlug);
}

/** Whether a discount still has uses left. Uses are paid orders plus checkouts still open. */
export function withinLimits(d: DiscountRule, used: { total: number; byClient: number }): boolean {
  if (d.maxUses != null && used.total >= d.maxUses) return false;
  if (d.kind === "code" && d.maxUsesPerClient != null && used.byClient >= d.maxUsesPerClient) return false;
  return true;
}

export type Offer = {
  listPence: number;
  pricePence: number;
  discountPence: number;
  discount: { id: string; kind: DiscountKind; label: string } | null;
};

/**
 * The price the client pays. Discounts never stack: of those that apply,
 * the one giving the lowest price wins, a concession on a tie.
 */
export function bestOffer(listPence: number, usable: DiscountRule[]): Offer {
  let best: Offer = { listPence, pricePence: listPence, discountPence: 0, discount: null };
  for (const d of usable) {
    const price = priceAfter(listPence, d);
    const better = price < best.pricePence || (price === best.pricePence && best.discount?.kind === "code" && d.kind === "client");
    if (better && price < listPence) {
      best = { listPence, pricePence: price, discountPence: listPence - price, discount: { id: d.id, kind: d.kind, label: d.label } };
    }
  }
  return best;
}

/** Codes are stored and compared in capitals, without spaces. */
export function normaliseCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export function isValidCode(code: string): boolean {
  return /^[A-Z0-9]{3,20}$/.test(code);
}

/** "£15" or "15% off" or "£5 off", for screens and emails. */
export function describeDiscount(d: Pick<DiscountRule, "percentOff" | "amountOffPence">): string {
  if (d.percentOff != null) return `${d.percentOff}% off`;
  return `${penceLabel(d.amountOffPence ?? 0)} off`;
}

export function penceLabel(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
  }).format(pence / 100);
}

/* ------------------------------------------------------------- the forms */

export type PlanPrice = { slug: string; name: string; amountPence: number };

export type DiscountFormInput = {
  label: string;
  type: string;
  value: string;
  planSlugs: string[];
  maxUses: string;
  maxUsesPerClient: string;
  startsOn: string;
  endsOn: string;
  reason: string;
  note: string;
  code: string;
};

export type ParsedDiscount = {
  code: string | null;
  label: string;
  percentOff: number | null;
  amountOffPence: number | null;
  planSlugs: string[] | null;
  maxUses: number | null;
  maxUsesPerClient: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  reason: DiscountReason | null;
  note: string | null;
};

const LDN = "Europe/London";

function wholeNumber(v: string): number | null {
  return /^\d+$/.test(v.trim()) ? Number(v.trim()) : null;
}

/** "5", "5.5" or "5.50" pounds, as pence. */
export function poundsToPence(v: string): number | null {
  const m = v.trim().replace(/^£/, "").match(/^(\d{1,4})(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
}

/**
 * Check a concession or code before it is saved, against today's prices:
 * a discount must leave £0 (concessions only) or at least £1 on everything
 * it covers.
 */
export function parseDiscountForm(
  kind: DiscountKind,
  input: DiscountFormInput,
  plans: PlanPrice[],
  now: Date
): { ok: true; value: ParsedDiscount } | { ok: false; fieldErrors: Record<string, string> } {
  const fe: Record<string, string> = {};

  let code: string | null = null;
  if (kind === "code") {
    code = normaliseCode(input.code);
    if (!isValidCode(code)) fe.code = "Use 3 to 20 letters and numbers, e.g. WELCOME10.";
  }

  const label = input.label.trim() || (kind === "client" ? DEFAULT_CONCESSION_LABEL : "");
  if (label.length < 2 || label.length > 60) fe.label = "Give it a short name the client will see.";

  let percentOff: number | null = null;
  let amountOffPence: number | null = null;
  if (input.type === "percent") {
    const n = wholeNumber(input.value);
    const max = kind === "code" ? CODE_MAX_PERCENT : 100;
    if (n == null || n < 1 || n > max) fe.value = `Enter a whole percentage from 1 to ${max}.`;
    else percentOff = n;
  } else if (input.type === "amount") {
    const p = poundsToPence(input.value);
    if (p == null || p < 1) fe.value = "Enter an amount in pounds, e.g. 10 or 7.50.";
    else amountOffPence = p;
  } else {
    fe.value = "Choose a percentage or an amount off.";
  }

  const known = new Set(plans.map((p) => p.slug));
  const chosen = [...new Set(input.planSlugs.filter((s) => known.has(s)))];
  if (chosen.length === 0) fe.planSlugs = "Choose at least one thing it applies to.";
  const covered = plans.filter((p) => chosen.includes(p.slug));

  if (!fe.value && covered.length) {
    for (const p of covered) {
      const price = rawPrice(p.amountPence, { percentOff, amountOffPence });
      if (price === 0 && kind === "code") {
        fe.value = `A code can't make ${p.name} free. To give something free, use a concession or Free sessions on the client's record.`;
        break;
      }
      if (price > 0 && price < MIN_CHARGE_PENCE) {
        fe.value = `That would leave less than £1 to pay for ${p.name}, which Stripe can't take. Make the discount smaller, or 100% to make it free.`;
        break;
      }
      if (price === p.amountPence) {
        fe.value = `That takes nothing off ${p.name}.`;
        break;
      }
    }
  }

  const maxUses = input.maxUses.trim() ? wholeNumber(input.maxUses) : null;
  if (input.maxUses.trim() && (maxUses == null || maxUses < 1)) fe.maxUses = "Enter a whole number, or leave it empty for no limit.";
  let maxUsesPerClient: number | null = null;
  if (kind === "code") {
    maxUsesPerClient = input.maxUsesPerClient.trim() ? wholeNumber(input.maxUsesPerClient) : 1;
    if (maxUsesPerClient == null || maxUsesPerClient < 1) fe.maxUsesPerClient = "Enter a whole number, 1 or more.";
  }

  const day = /^\d{4}-\d{2}-\d{2}$/;
  const startsAt = input.startsOn.trim() ? (day.test(input.startsOn) ? zonedTimeToUtc(input.startsOn, "00:00", LDN) : null) : null;
  if (input.startsOn.trim() && !startsAt) fe.startsOn = "Choose a date.";
  // An end date includes that whole day (UK time).
  const endsAt = input.endsOn.trim() ? (day.test(input.endsOn) ? zonedTimeToUtc(addDays(input.endsOn, 1), "00:00", LDN) : null) : null;
  if (input.endsOn.trim() && !endsAt) fe.endsOn = "Choose a date.";
  else if (endsAt && endsAt <= now) fe.endsOn = "The end date has already passed.";
  else if (endsAt && startsAt && endsAt <= startsAt) fe.endsOn = "The end date must be after the start date.";

  let reason: DiscountReason | null = null;
  if (kind === "client") {
    const r = DISCOUNT_REASONS.find((x) => x.value === input.reason);
    if (!r) fe.reason = "Choose a reason.";
    else reason = r.value;
  }
  const note = input.note.trim();
  if (note.length > 300) fe.note = "Please keep the note under 300 characters.";

  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };
  return {
    ok: true,
    value: {
      code,
      label,
      percentOff,
      amountOffPence,
      // Everything chosen means everything, including plans added later.
      planSlugs: chosen.length === plans.length ? null : chosen,
      maxUses,
      maxUsesPerClient,
      startsAt,
      endsAt,
      reason,
      note: note || null,
    },
  };
}

export type FreeSessionsInput = { what: string; count: string; reason: string; note: string };

/** Check a grant of free sessions. The consultation is always one. */
export function parseFreeSessions(
  input: FreeSessionsInput
):
  | { ok: true; value: { what: "consultation" | "session"; count: number; reason: DiscountReason; note: string | null } }
  | { ok: false; fieldErrors: Record<string, string> } {
  const fe: Record<string, string> = {};
  const what = input.what === "consultation" || input.what === "session" ? input.what : null;
  if (!what) fe.what = "Choose what to give.";
  const count = what === "consultation" ? 1 : wholeNumber(input.count);
  if (what === "session" && (count == null || count < 1 || count > 12)) fe.count = "Enter a number of sessions from 1 to 12.";
  const reason = DISCOUNT_REASONS.find((x) => x.value === input.reason)?.value ?? null;
  if (!reason) fe.reason = "Choose a reason.";
  const note = input.note.trim();
  if (note.length > 300) fe.note = "Please keep the note under 300 characters.";
  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };
  return { ok: true, value: { what: what!, count: count!, reason: reason!, note: note || null } };
}
