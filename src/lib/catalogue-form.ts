import { displayPrice, poundsToPence } from "./money";

/** The parts of a price plan the owner edits. */
export type PlanEdit = {
  name: string;
  blurb: string | null;
  amountPence: number;
  sessions: number;
  sortOrder: number;
  active: boolean;
  featured: boolean;
};

/**
 * Read the price plan form.
 *
 * Strict on purpose: this sets what clients are charged, so anything unclear
 * is refused with a reason rather than saved as a best guess.
 */
export function parsePlanEdit(get: (name: string) => string): { ok: true; plan: PlanEdit } | { ok: false; message: string } {
  const name = get("name").trim();
  if (!name) return { ok: false, message: "Please give the plan a name." };

  const amountPence = poundsToPence(get("price"));
  if (amountPence === null || amountPence <= 0) {
    return { ok: false, message: "Please enter the price in pounds, for example 40 or 40.50." };
  }

  const sessions = Number(get("sessions"));
  if (!Number.isInteger(sessions) || sessions < 1 || sessions > 52) {
    return { ok: false, message: "Sessions must be a whole number from 1 to 52." };
  }

  const sortOrder = Number(get("sortOrder") || "0");
  if (!Number.isInteger(sortOrder)) return { ok: false, message: "Order must be a whole number." };

  return {
    ok: true,
    plan: {
      name,
      blurb: get("blurb").trim() || null,
      amountPence,
      sessions,
      sortOrder,
      active: get("active") === "on",
      featured: get("featured") === "on",
    },
  };
}

/** "price £30 → £35; sessions 1 → 2" — for the activity log. Empty if nothing changed. */
export function describePlanChanges(before: PlanEdit, after: PlanEdit): string {
  const changes: string[] = [];
  if (before.name !== after.name) changes.push(`name "${before.name}" → "${after.name}"`);
  if (before.amountPence !== after.amountPence) {
    changes.push(`price ${displayPrice(before.amountPence)} → ${displayPrice(after.amountPence)}`);
  }
  if (before.sessions !== after.sessions) changes.push(`sessions ${before.sessions} → ${after.sessions}`);
  if ((before.blurb ?? "") !== (after.blurb ?? "")) changes.push("description changed");
  if (before.sortOrder !== after.sortOrder) changes.push(`order ${before.sortOrder} → ${after.sortOrder}`);
  if (before.active !== after.active) changes.push(after.active ? "put on sale" : "taken off sale");
  if (before.featured !== after.featured) changes.push(after.featured ? "highlighted" : "no longer highlighted");
  return changes.join("; ");
}
