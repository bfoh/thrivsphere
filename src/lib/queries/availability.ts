import "server-only";

import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appointments,
  availabilityExceptions,
  availabilityRules,
  services,
  users,
} from "@/db/schema";
import { generateSlots, type Slot } from "@/lib/slots";
import { addDays } from "@/lib/time";

/** The practitioner sessions are booked with. */
export async function getDefaultPractitioner() {
  const db = getDb();
  const staff = await db
    .select({ id: users.id, displayName: users.displayName, email: users.email, role: users.role })
    .from(users)
    .where(inArray(users.role, ["practitioner", "supervisor", "admin"]))
    .limit(1);
  return staff[0] ?? null;
}

export async function getAvailability(practitionerId: string) {
  const db = getDb();
  const [rules, exceptions] = await Promise.all([
    db
      .select()
      .from(availabilityRules)
      .where(eq(availabilityRules.practitionerId, practitionerId)),
    db
      .select()
      .from(availabilityExceptions)
      .where(eq(availabilityExceptions.practitionerId, practitionerId)),
  ]);
  return { rules, exceptions };
}

/**
 * Bookable slots for a practitioner.
 *
 * Only `scheduled` appointments are treated as busy — a cancelled session must
 * release its time, and a completed one is in the past anyway.
 */
export async function getBookableSlots({
  practitionerId,
  durationMinutes = 50,
  days = 28,
  from,
  now = new Date(),
}: {
  practitionerId: string;
  durationMinutes?: number;
  days?: number;
  from?: string;
  now?: Date;
}): Promise<Slot[]> {
  const db = getDb();
  const fromDate = from ?? new Date().toISOString().slice(0, 10);
  const toDate = addDays(fromDate, days);

  const { rules, exceptions } = await getAvailability(practitionerId);

  const busy = await db
    .select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt })
    .from(appointments)
    .where(
      and(
        eq(appointments.practitionerId, practitionerId),
        eq(appointments.status, "scheduled"),
        gte(appointments.startsAt, new Date(`${fromDate}T00:00:00Z`)),
        lte(appointments.startsAt, new Date(`${toDate}T23:59:59Z`))
      )
    );

  return generateSlots({
    rules: rules.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      timezone: r.timezone,
      active: r.active,
    })),
    exceptions: exceptions.map((e) => ({
      date: e.date,
      blocked: e.blocked,
      startTime: e.startTime,
      endTime: e.endTime,
    })),
    busy,
    fromDate,
    days,
    durationMinutes,
    now,
  });
}

export async function getActiveServices() {
  const db = getDb();
  return db.select().from(services).where(eq(services.active, true)).orderBy(services.sortOrder);
}
