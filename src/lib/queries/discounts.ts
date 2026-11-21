import "server-only";

import { and, count, desc, eq, gt, inArray, or } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, discounts, orders, pricePlans, users } from "@/db/schema";
import { CHECKOUT_MINUTES } from "@/lib/allocation";
import {
  appliesTo,
  bestOffer,
  isValidCode,
  normaliseCode,
  withinLimits,
  type DiscountRule,
  type Offer,
} from "@/lib/discounts";

type Row = typeof discounts.$inferSelect;

function asRule(d: Row): DiscountRule {
  return {
    id: d.id,
    kind: d.kind,
    label: d.label,
    percentOff: d.percentOff,
    amountOffPence: d.amountOffPence,
    planSlugs: d.planSlugs,
    maxUses: d.maxUses,
    maxUsesPerClient: d.maxUsesPerClient,
    startsAt: d.startsAt,
    endsAt: d.endsAt,
    active: d.active,
  };
}

/**
 * How many times a discount has been used: paid orders, plus checkouts still
 * open (so a limit can't be beaten by opening several at once). Abandoned and
 * refunded orders give the use back.
 */
async function uses(discountId: string, clientId: string, now: Date) {
  const db = getDb();
  const live = or(
    eq(orders.status, "paid"),
    and(eq(orders.status, "pending"), gt(orders.createdAt, new Date(now.getTime() - CHECKOUT_MINUTES * 60_000)))
  );
  const [[total], [mine]] = await Promise.all([
    db.select({ n: count() }).from(orders).where(and(eq(orders.discountId, discountId), live)),
    db
      .select({ n: count() })
      .from(orders)
      .where(and(eq(orders.discountId, discountId), eq(orders.clientId, clientId), live)),
  ]);
  return { total: Number(total.n), byClient: Number(mine.n) };
}

/** The client's concession in force, if any. */
export async function getActiveConcession(clientId: string): Promise<Row | null> {
  const [row] = await getDb()
    .select()
    .from(discounts)
    .where(and(eq(discounts.kind, "client"), eq(discounts.clientId, clientId), eq(discounts.active, true)))
    .limit(1);
  return row ?? null;
}

/**
 * `codeError`: the code entered can't be used (checkout refuses it, so the
 * client knows). `codeNote`: it is valid but their concession is better.
 */
export type PriceOffer = Offer & { codeError?: string; codeNote?: string };

/**
 * What this client pays for this plan now: the full price, or less with
 * their concession or a code they entered, whichever is lower. Used wherever
 * a price is shown and wherever one is charged, so the two always agree.
 */
export async function getOffer({
  clientId,
  planSlug,
  listPence,
  code,
  now = new Date(),
}: {
  clientId: string;
  planSlug: string;
  listPence: number;
  code?: string | null;
  now?: Date;
}): Promise<PriceOffer> {
  const db = getDb();
  const usable: DiscountRule[] = [];
  let codeError: string | undefined;

  const concession = await getActiveConcession(clientId);
  if (concession && appliesTo(asRule(concession), planSlug, now) && withinLimits(asRule(concession), await uses(concession.id, clientId, now))) {
    usable.push(asRule(concession));
  }

  const entered = code ? normaliseCode(code) : "";
  if (entered) {
    const [row] = isValidCode(entered)
      ? await db.select().from(discounts).where(and(eq(discounts.kind, "code"), eq(discounts.code, entered))).limit(1)
      : [];
    if (!row || !row.active) codeError = "That code isn't recognised. Please check it and try again.";
    else if ((row.startsAt && now < row.startsAt) || (row.endsAt && now >= row.endsAt)) codeError = "That code isn't available at the moment.";
    else if (!appliesTo(asRule(row), planSlug, now)) codeError = "That code doesn't apply to this.";
    else if (!withinLimits(asRule(row), await uses(row.id, clientId, now))) codeError = "That code has already been used.";
    else usable.push(asRule(row));
  }

  const offer = bestOffer(listPence, usable);
  if (codeError) return { ...offer, codeError };
  // A valid code that the concession beats: not an error, but the client
  // should know why it made no difference.
  if (entered && offer.discount?.kind !== "code") {
    return { ...offer, codeNote: "Your concessionary price is already lower, so the code isn't needed." };
  }
  return offer;
}

/** Everything the Discounts page lists: active concessions and every code, with uses. */
export async function listDiscountsForAdmin(now: Date = new Date()) {
  const db = getDb();
  const rows = await db
    .select({ d: discounts, clientName: clients.preferredName, creatorName: users.displayName, creatorEmail: users.email })
    .from(discounts)
    .leftJoin(clients, eq(clients.id, discounts.clientId))
    .leftJoin(users, eq(users.id, discounts.createdBy))
    .where(or(eq(discounts.kind, "code"), eq(discounts.active, true)))
    .orderBy(desc(discounts.createdAt));

  const ids = rows.map((r) => r.d.id);
  const paid = ids.length
    ? await db
        .select({ id: orders.discountId, n: count() })
        .from(orders)
        .where(and(inArray(orders.discountId, ids), eq(orders.status, "paid")))
        .groupBy(orders.discountId)
    : [];
  const usedBy = new Map(paid.map((p) => [p.id, Number(p.n)]));

  return rows.map((r) => ({
    ...r.d,
    clientName: r.clientName,
    createdByName: r.creatorName || r.creatorEmail,
    used: usedBy.get(r.d.id) ?? 0,
    current: appliesToAnything(asRule(r.d), now),
  }));
}

function appliesToAnything(d: DiscountRule, now: Date): boolean {
  return d.active && (!d.startsAt || now >= d.startsAt) && (!d.endsAt || now < d.endsAt);
}

/** Active plans with their prices, for the discount forms. */
export async function planPrices() {
  return getDb()
    .select({ slug: pricePlans.slug, name: pricePlans.name, amountPence: pricePlans.amountPence })
    .from(pricePlans)
    .where(eq(pricePlans.active, true))
    .orderBy(pricePlans.sortOrder);
}

/** A client's discounted and complimentary orders, newest first, for their record. */
export async function listClientDiscountHistory(clientId: string) {
  return getDb()
    .select({
      id: orders.id,
      plan: orders.planNameAtPurchase,
      amountPence: orders.amountPence,
      listPricePence: orders.listPricePence,
      discountPence: orders.discountPence,
      discountLabel: orders.discountLabel,
      complimentary: orders.complimentary,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(and(eq(orders.clientId, clientId), or(gt(orders.discountPence, 0), eq(orders.complimentary, true))))
    .orderBy(desc(orders.createdAt))
    .limit(20);
}
