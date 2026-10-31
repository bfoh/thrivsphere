"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { pricePlans } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { recordAudit } from "@/lib/audit";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz";
import { describePlanChanges, parsePlanEdit } from "@/lib/catalogue-form";
import type { BookingState } from "@/lib/booking-state";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Edit a price plan (checklist §13: prices updated without a developer).
 *
 * The pricing page, the client's purchase page and Stripe checkout all read
 * this row, so the change reaches all three together. Payments already made
 * keep the amount they were made at. Every change is logged old → new.
 */
export async function updatePricePlan(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const get = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" ? v : "";
  };
  const id = get("planId");
  if (!UUID.test(id)) return { status: "error", message: "Missing plan." };

  let actorId: string;
  try {
    const actor = await requireCapability("catalogue:manage", {
      entity: "price_plans",
      entityId: id,
      action: "update",
      detail: "edited price plan",
    });
    actorId = actor.userId;
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return { status: "error", message: "Your session has expired. Please sign in again." };
    }
    if (err instanceof ForbiddenError) return { status: "error", message: err.message };
    throw err;
  }

  const parsed = parsePlanEdit(get);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const db = getDb();
  const [before] = await db.select().from(pricePlans).where(eq(pricePlans.id, id)).limit(1);
  if (!before) return { status: "error", message: "That plan no longer exists." };

  const changes = describePlanChanges(before, parsed.plan);
  if (!changes) return { status: "ok", message: "No changes to save." };

  await db
    .update(pricePlans)
    .set({ ...parsed.plan, updatedAt: new Date() })
    .where(eq(pricePlans.id, id));

  await recordAudit({
    actorId,
    action: "update",
    entity: "price_plans",
    entityId: id,
    detail: `${before.slug}: ${changes}`,
  });

  revalidatePath("/pricing");
  revalidatePath("/portal/purchase");
  revalidatePath("/admin/catalogue");
  return { status: "ok", message: "Saved. The pricing page and checkout now use this." };
}
