import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, clients, users } from "@/db/schema";
import { canSeeEmergencyContact } from "@/lib/emergency-contact";
import type { Actor } from "@/lib/authz";

/** The client's Emergency Contact / Next of Kin answer, for their own form. */
export async function getEmergencyContact(clientId: string) {
  const [row] = await getDb()
    .select({
      status: clients.emergencyContactStatus,
      name: clients.emergencyContactName,
      relationship: clients.emergencyContactRelationship,
      phone: clients.emergencyContactPhone,
      alt: clients.emergencyContactAlt,
      country: clients.emergencyContactCountry,
      timeZone: clients.emergencyContactTimeZone,
      method: clients.emergencyContactMethod,
      methodOther: clients.emergencyContactMethodOther,
      informed: clients.emergencyContactInformed,
      updatedAt: clients.emergencyContactUpdatedAt,
    })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  return row ?? null;
}

/**
 * Whether this member of staff may see the client's emergency contact
 * (IT handover §15.4): the Safeguarding Lead, the Deputy, or a practitioner
 * the client has a booked, held or past appointment with. A time left unpaid
 * or a cancelled appointment doesn't count.
 */
export async function maySeeEmergencyContact(actor: Actor, clientId: string): Promise<boolean> {
  if (actor.role === "founder") return true;
  const db = getDb();
  const [[me], [appt]] = await Promise.all([
    db.select({ deputy: users.safeguardingDeputy }).from(users).where(eq(users.id, actor.userId)).limit(1),
    db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.clientId, clientId),
          eq(appointments.practitionerId, actor.userId),
          inArray(appointments.status, ["scheduled", "completed", "no_show"])
        )
      )
      .limit(1),
  ]);
  return canSeeEmergencyContact({ role: actor.role, safeguardingDeputy: !!me?.deputy, isTheirPractitioner: !!appt });
}
