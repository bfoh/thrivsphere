"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { pricePlans, services } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { recordAudit } from "@/lib/audit";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz";
import { describePlanChanges, describeServiceChanges, parsePlanEdit, parseServiceEdit } from "@/lib/catalogue-form";
import type { BookingState } from "@/lib/booking-state";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function reader(formData: FormData) {
  return (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" ? v : "";
  };
}

/** Only the owner and admins edit what the website offers and charges. */
async function editor(entity: string, entityId: string, detail: string): Promise<{ userId: string } | BookingState> {
  try {
    return await requireCapability("catalogue:manage", { entity, entityId, action: "update", detail });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return { status: "error", message: "Your session has expired. Please sign in again." };
    }
    if (err instanceof ForbiddenError) return { status: "error", message: err.message };
    throw err;
  }
}

/**
 * Edit a price plan (checklist §13: prices updated without a developer).
 *
 * The pricing page, the client's purchase page and Stripe checkout all read
 * this row, so the change reaches all three together. Payments already made
 * keep the amount they were made at. Every change is logged old → new.
 */
export async function updatePricePlan(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const get = reader(formData);
  const id = get("planId");
  if (!UUID.test(id)) return { status: "error", message: "Missing plan." };

  const actor = await editor("price_plans", id, "edited price plan");
  if ("status" in actor) return actor;
  const actorId = actor.userId;

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

/**
 * Edit a service's wording (checklist §13: update service descriptions).
 *
 * Shown on the homepage and /services, which are refreshed straight away.
 */
export async function updateService(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const get = reader(formData);
  const id = get("serviceId");
  if (!UUID.test(id)) return { status: "error", message: "Missing service." };

  const actor = await editor("services", id, "edited service");
  if ("status" in actor) return actor;

  const parsed = parseServiceEdit(get);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const db = getDb();
  const [before] = await db.select().from(services).where(eq(services.id, id)).limit(1);
  if (!before) return { status: "error", message: "That service no longer exists." };

  const changes = describeServiceChanges(before, parsed.service);
  if (!changes) return { status: "ok", message: "No changes to save." };

  await db
    .update(services)
    .set({ ...parsed.service, updatedAt: new Date() })
    .where(eq(services.id, id));

  await recordAudit({
    actorId: actor.userId,
    action: "update",
    entity: "services",
    entityId: id,
    detail: `${before.slug}: ${changes}`,
  });

  revalidatePath("/");
  revalidatePath("/services");
  revalidatePath("/admin/catalogue");
  return { status: "ok", message: "Saved. The website now shows this." };
}
