import "server-only";

import { and, eq, gte, inArray, lte, ne } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appointments,
  availabilityExceptions,
  availabilityRules,
  users,
} from "@/db/schema";
import { generateSlots, type Slot } from "@/lib/slots";
import { poolSlots, type PooledSlot } from "@/lib/allocation";
import { STAFF_ROLES } from "@/lib/authz";
import { addDays } from "@/lib/time";

/** Every session is 50 minutes (checklist §6). Fixed here, never taken from a form. */
export const SESSION_MINUTES = 50;

/** Every active staff member, named for the back office. */
export async function getActiveStaff() {
  const rows = await getDb()
    .select({ id: users.id, displayName: users.displayName, email: users.email, role: users.role })
    .from(users)
    .where(and(inArray(users.role, STAFF_ROLES), eq(users.status, "active")))
    .orderBy(users.createdAt);
  return rows.map((r) => ({ ...r, name: r.displayName || r.email }));
}

/**
 * Staff who can take bookings: any active staff member — the founder included —
 * who has set weekly hours or opened extra hours from today on.
 *
 * Adding a practitioner is therefore inviting them and having them set their
 * availability; nothing else needs to change for clients to be offered them.
 */
export async function getBookablePractitioners() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const staff = await getActiveStaff();
  if (staff.length === 0) return [];

  const ids = staff.map((s) => s.id);
  const [withRules, withExtraHours] = await Promise.all([
    db
      .selectDistinct({ id: availabilityRules.practitionerId })
      .from(availabilityRules)
      .where(and(inArray(availabilityRules.practitionerId, ids), eq(availabilityRules.active, true))),
    db
      .selectDistinct({ id: availabilityExceptions.practitionerId })
      .from(availabilityExceptions)
      .where(
        and(
          inArray(availabilityExceptions.practitionerId, ids),
          eq(availabilityExceptions.blocked, false),
          gte(availabilityExceptions.date, today)
        )
      ),
  ]);

  const bookable = new Set([...withRules, ...withExtraHours].map((r) => r.id));
  return staff.filter((s) => bookable.has(s.id));
}

/**
 * The times a client can choose from, across every bookable practitioner.
 *
 * Times that clash with the client's own booked sessions are left out. When
 * rescheduling, the appointment being moved does not count as a clash.
 */
export async function getPooledSlots({
  clientId,
  days = 28,
  excludeAppointmentId,
  now = new Date(),
}: {
  clientId: string;
  days?: number;
  excludeAppointmentId?: string;
  now?: Date;
}): Promise<PooledSlot[]> {
  const db = getDb();
  const practitioners = await getBookablePractitioners();

  const [perPractitioner, clientBusy] = await Promise.all([
    Promise.all(
      practitioners.map(async (p) => ({
        practitionerId: p.id,
        slots: await getBookableSlots({ practitionerId: p.id, durationMinutes: SESSION_MINUTES, days, now }),
      }))
    ),
    db
      .select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt })
      .from(appointments)
      .where(
        and(
          eq(appointments.clientId, clientId),
          eq(appointments.status, "scheduled"),
          gte(appointments.endsAt, now),
          excludeAppointmentId ? ne(appointments.id, excludeAppointmentId) : undefined
        )
      ),
  ]);

  return poolSlots(perPractitioner, clientBusy);
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
