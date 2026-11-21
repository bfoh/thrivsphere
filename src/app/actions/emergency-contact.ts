"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { clients } from "@/db/schema";
import { recordAudit } from "@/lib/audit";
import { requirePortalClient } from "@/lib/portal-guard";
import { getCurrentActor } from "@/lib/session";
import { answerLabel, parseEmergencyContact } from "@/lib/emergency-contact";

export type EmergencyContactState = {
  status: "idle" | "ok" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
};

/**
 * A client saves their Emergency Contact / Next of Kin, or records that they
 * are unable or would prefer not to give one (IT handover §15.2). Their own
 * record only. The change is logged; the details themselves are not, and the
 * contact is never messaged.
 *
 * From the booking page (`from=book`) it returns them to choosing a time.
 */
export async function saveEmergencyContact(_prev: EmergencyContactState, formData: FormData): Promise<EmergencyContactState> {
  const { clientId } = await requirePortalClient();
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  const parsed = parseEmergencyContact({ get: (n) => String(formData.get(n) ?? "") });
  if (!parsed.ok) return { status: "error", message: "Please check the highlighted answers.", fieldErrors: parsed.errors };
  const v = parsed.value;

  await getDb()
    .update(clients)
    .set({
      emergencyContactStatus: v.status,
      emergencyContactName: v.name,
      emergencyContactRelationship: v.relationship,
      emergencyContactPhone: v.phone,
      emergencyContactAlt: v.alt,
      emergencyContactCountry: v.country,
      emergencyContactTimeZone: v.timeZone,
      emergencyContactMethod: v.method,
      emergencyContactMethodOther: v.methodOther,
      emergencyContactInformed: v.informed,
      emergencyContactUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(clients.id, clientId));

  await recordAudit({
    actorId: actor.userId,
    action: "update",
    entity: "clients",
    entityId: clientId,
    subjectClientId: clientId,
    detail: `emergency contact updated by the client: ${answerLabel(v.status).toLowerCase()}`,
  });

  revalidatePath("/portal/details");
  revalidatePath(`/admin/clients/${clientId}`);
  if (formData.get("from") === "book") redirect("/portal/book");
  return { status: "ok", message: "Saved. Thank you." };
}
