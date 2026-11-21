"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, discounts, orders, pricePlans } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { ForbiddenError, UnauthenticatedError, type Actor } from "@/lib/authz";
import { REVIEW_PLAN_SLUG, SESSION_PLAN_SLUG } from "@/lib/allocation";
import { grantPackage } from "@/lib/booking-engine";
import {
  describeDiscount,
  parseDiscountForm,
  parseFreeSessions,
  penceLabel,
  reasonLabel,
  type DiscountFormInput,
  type DiscountKind,
} from "@/lib/discounts";
import { getOffer, planPrices } from "@/lib/queries/discounts";
import { sendEmail } from "@/lib/email";
import { sessionsAdded } from "@/lib/email-templates";
import { getCurrentActor } from "@/lib/session";
import type { CodeCheckState, DiscountAdminState } from "@/lib/discount-state";

/**
 * Concessions, discount codes and free sessions, given by the founder or an
 * admin (`discount:manage`). Every action goes through the guard, so it is
 * permission-checked and in Activity with who did it.
 */

function str(fd: FormData, name: string) {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

async function guard(
  detail: string,
  o: { entityId?: string | null; clientId?: string | null; action: "create" | "update" }
): Promise<Actor | DiscountAdminState> {
  try {
    return await requireCapability("discount:manage", {
      entity: "discounts",
      entityId: o.entityId ?? null,
      subjectClientId: o.clientId ?? null,
      action: o.action,
      detail,
    });
  } catch (err) {
    if (err instanceof UnauthenticatedError) return { status: "error", message: "Your session has expired. Please sign in again." };
    if (err instanceof ForbiddenError) return { status: "error", message: err.message };
    throw err;
  }
}

const refused = (v: Actor | DiscountAdminState): v is DiscountAdminState => "status" in v && "message" in v;

function formInput(fd: FormData): DiscountFormInput {
  return {
    label: str(fd, "label"),
    type: str(fd, "type"),
    value: str(fd, "value"),
    planSlugs: fd.getAll("planSlugs").filter((v): v is string => typeof v === "string"),
    maxUses: str(fd, "maxUses"),
    maxUsesPerClient: str(fd, "maxUsesPerClient"),
    startsOn: str(fd, "startsOn"),
    endsOn: str(fd, "endsOn"),
    reason: str(fd, "reason"),
    note: str(fd, "note"),
    code: str(fd, "code"),
  };
}

function refresh(clientId?: string | null) {
  revalidatePath("/admin/discounts");
  if (clientId) revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/portal/book");
  revalidatePath("/portal/purchase");
}

async function clientExists(clientId: string) {
  const [row] = await getDb().select({ id: clients.id, email: clients.email }).from(clients).where(eq(clients.id, clientId)).limit(1);
  return row ?? null;
}

/* ------------------------------------------------------------ concessions */

/** Give a client a concession. A concession they already had ends. */
export async function giveConcession(_prev: DiscountAdminState, fd: FormData): Promise<DiscountAdminState> {
  const clientId = str(fd, "clientId");
  if (!clientId) return { status: "error", message: "Missing client." };
  return saveDiscount("client", fd, clientId);
}

/** End a client's concession now. Purchases already made are unaffected. */
export async function endConcession(_prev: DiscountAdminState, fd: FormData): Promise<DiscountAdminState> {
  return endDiscount(str(fd, "discountId"), "client");
}

/* ------------------------------------------------------------------ codes */

export async function createCode(_prev: DiscountAdminState, fd: FormData): Promise<DiscountAdminState> {
  return saveDiscount("code", fd, null);
}

/** Turn a code off: it stops working at once. */
export async function turnOffCode(_prev: DiscountAdminState, fd: FormData): Promise<DiscountAdminState> {
  return endDiscount(str(fd, "discountId"), "code");
}

async function saveDiscount(kind: DiscountKind, fd: FormData, clientId: string | null): Promise<DiscountAdminState> {
  const now = new Date();
  const plans = await planPrices();
  const parsed = parseDiscountForm(kind, formInput(fd), plans, now);
  if (!parsed.ok) return { status: "error", message: "Please check the highlighted fields.", fieldErrors: parsed.fieldErrors };
  const v = parsed.value;
  const what = describeDiscount(v);
  const covers = v.planSlugs ? plans.filter((p) => v.planSlugs!.includes(p.slug)).map((p) => p.name).join(", ") : "everything";

  const actor = await guard(
    kind === "client"
      ? `gave a concession: ${v.label}, ${what} on ${covers} (${reasonLabel(v.reason)})`
      : `created discount code ${v.code}: ${what} on ${covers}`,
    { clientId, action: "create" }
  );
  if (refused(actor)) return actor;

  const db = getDb();
  if (clientId && !(await clientExists(clientId))) return { status: "error", message: "That client no longer exists." };
  if (v.code) {
    const [taken] = await db.select({ id: discounts.id }).from(discounts).where(eq(discounts.code, v.code)).limit(1);
    if (taken) return { status: "error", message: "Please check the highlighted fields.", fieldErrors: { code: "That code already exists. Choose another." } };
  }

  const row = {
    kind,
    clientId,
    code: v.code,
    label: v.label,
    percentOff: v.percentOff,
    amountOffPence: v.amountOffPence,
    planSlugs: v.planSlugs,
    maxUses: v.maxUses,
    maxUsesPerClient: v.maxUsesPerClient,
    startsAt: v.startsAt,
    endsAt: v.endsAt,
    reason: v.reason,
    note: v.note,
    createdBy: actor.userId,
  } satisfies typeof discounts.$inferInsert;

  try {
    if (kind === "client" && clientId) {
      // One active concession per client: the old one ends as the new one starts.
      await db.batch([
        db
          .update(discounts)
          .set({ active: false, endedBy: actor.userId, endedAt: now, updatedAt: now })
          .where(and(eq(discounts.kind, "client"), eq(discounts.clientId, clientId), eq(discounts.active, true))),
        db.insert(discounts).values(row),
      ]);
    } else {
      await db.insert(discounts).values(row);
    }
  } catch (err) {
    console.error("[discounts] not saved", err);
    return { status: "error", message: "That couldn't be saved. Please try again." };
  }

  refresh(clientId);
  return {
    status: "ok",
    message: kind === "client" ? `Concession saved: ${what}.` : `Code ${v.code} created: ${what}.`,
  };
}

async function endDiscount(discountId: string, kind: DiscountKind): Promise<DiscountAdminState> {
  if (!discountId) return { status: "error", message: "Missing discount." };
  const db = getDb();
  const [d] = await db.select().from(discounts).where(and(eq(discounts.id, discountId), eq(discounts.kind, kind))).limit(1);
  if (!d) return { status: "error", message: "That discount no longer exists." };
  if (!d.active) return { status: "ok", message: "It had already ended." };

  const actor = await guard(
    kind === "client" ? `ended concession ${d.label}` : `turned off discount code ${d.code}`,
    { entityId: d.id, clientId: d.clientId, action: "update" }
  );
  if (refused(actor)) return actor;

  const now = new Date();
  await db
    .update(discounts)
    .set({ active: false, endedBy: actor.userId, endedAt: now, updatedAt: now })
    .where(eq(discounts.id, d.id));
  refresh(d.clientId);
  return { status: "ok", message: kind === "client" ? "Concession ended." : `Code ${d.code} turned off.` };
}

/* ---------------------------------------------------------- free sessions */

/**
 * Add complimentary sessions to a client's account: a £0 order, marked
 * complimentary, and a package, as if bought, but with nothing at Stripe.
 * The client then books as usual.
 */
export async function addFreeSessions(_prev: DiscountAdminState, fd: FormData): Promise<DiscountAdminState> {
  const clientId = str(fd, "clientId");
  if (!clientId) return { status: "error", message: "Missing client." };
  const parsed = parseFreeSessions({ what: str(fd, "what"), count: str(fd, "count"), reason: str(fd, "reason"), note: str(fd, "note") });
  if (!parsed.ok) return { status: "error", message: "Please check the highlighted fields.", fieldErrors: parsed.fieldErrors };
  const v = parsed.value;
  const consultation = v.what === "consultation";

  const db = getDb();
  const [plan] = await db
    .select()
    .from(pricePlans)
    .where(eq(pricePlans.slug, consultation ? REVIEW_PLAN_SLUG : SESSION_PLAN_SLUG))
    .limit(1);
  if (!plan) return { status: "error", message: "That isn't on the price list just now." };

  const name = consultation || v.count === 1 ? plan.name : `${v.count} × ${plan.name}`;
  const actor = await guard(
    `added complimentary ${name} (${reasonLabel(v.reason)})${v.note ? `: ${v.note}` : ""}`,
    { clientId, action: "create" }
  );
  if (refused(actor)) return actor;

  const client = await clientExists(clientId);
  if (!client) return { status: "error", message: "That client no longer exists." };

  const listPence = plan.amountPence * v.count;
  const [order] = await db
    .insert(orders)
    .values({
      clientId,
      pricePlanId: plan.id,
      planNameAtPurchase: name,
      amountPence: 0,
      currency: plan.currency,
      status: "paid",
      paidAt: new Date(),
      listPricePence: listPence,
      discountPence: listPence,
      discountLabel: "Complimentary",
      complimentary: true,
    })
    .returning();
  const { pkg } = await grantPackage({ clientId, orderId: order.id, sessions: v.count, validityDays: plan.validityDays });
  if (!pkg) return { status: "error", message: "The sessions couldn't be added. Please try again." };

  if (client.email) {
    const email = sessionsAdded({ sessions: v.count, consultation });
    const sent = await sendEmail({ to: client.email, subject: email.subject, text: email.text, html: email.html });
    if (!sent.ok) console.error("[discounts] sessions-added email not sent:", sent.reason);
  }

  refresh(clientId);
  return {
    status: "ok",
    message: consultation
      ? "Complimentary consultation added. The client has been emailed."
      : `${v.count === 1 ? "1 complimentary session" : `${v.count} complimentary sessions`} added. The client has been emailed.`,
  };
}

/* ------------------------------------------------------- the client's side */

/**
 * Check a code before paying, and show the price it gives. Checked again,
 * from scratch, when they press Pay.
 */
export async function checkDiscountCode(_prev: CodeCheckState, fd: FormData): Promise<CodeCheckState> {
  const actor = await getCurrentActor();
  if (!actor?.clientId) return { status: "error", message: "Please sign in first." };
  const code = str(fd, "code");
  const planSlug = str(fd, "planSlug");
  if (!code) return { status: "error", message: "Enter a code." };

  const [plan] = await getDb()
    .select({ slug: pricePlans.slug, amountPence: pricePlans.amountPence })
    .from(pricePlans)
    .where(and(eq(pricePlans.slug, planSlug), eq(pricePlans.active, true)))
    .limit(1);
  if (!plan) return { status: "error", message: "That is no longer available." };

  const offer = await getOffer({ clientId: actor.clientId, planSlug: plan.slug, listPence: plan.amountPence, code });
  if (offer.codeError) return { status: "error", message: offer.codeError };
  const result = { code, listPence: offer.listPence, pricePence: offer.pricePence, label: offer.discount?.label };
  if (offer.codeNote) return { status: "ok", message: offer.codeNote, ...result };
  return {
    status: "ok",
    message: `Code applied: ${penceLabel(offer.discountPence)} off. You'll pay ${penceLabel(offer.pricePence)}.`,
    ...result,
  };
}
