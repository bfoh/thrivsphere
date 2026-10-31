import type { Plan } from "@/data/site";

type PlanRow = {
  slug: string;
  name: string;
  blurb: string | null;
  amountPence: number;
  sessions: number;
  featured: boolean;
};

export type PricingCard = Omit<Plan, "amountPence"> & { amountPence: number };

/**
 * A pricing card: price, name and sessions from the database, wording from
 * src/data/site.ts.
 *
 * The database owns everything that is charged, so the card can never show a
 * different price from checkout. The site copy only describes the plan, and a
 * plan added later without copy still gets a sensible card.
 */
export function toPricingCard(row: PlanRow, copy: Plan | undefined): PricingCard {
  const multi = row.sessions > 1;
  return {
    slug: row.slug,
    name: row.name,
    amountPence: row.amountPence,
    sessions: row.sessions,
    featured: row.featured,
    blurb: row.blurb ?? copy?.blurb ?? "",
    unit: copy?.unit ?? (multi ? `${row.sessions} × 50-minute sessions` : "50 minutes"),
    features: copy?.features ?? [],
    cta: copy?.cta ?? (multi ? "Buy sessions" : "Book a session"),
  };
}
