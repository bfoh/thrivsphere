import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requirePortalClient } from "@/lib/portal-guard";
import { requireClientAccess } from "@/lib/guard";
import { getDb } from "@/db";
import { appointments } from "@/db/schema";
import { canReschedule } from "@/lib/allocation";
import { getPooledSlots } from "@/lib/queries/availability";
import { formatAppointment, groupSlotsByDay } from "@/lib/slot-groups";
import { SlotPicker } from "@/components/portal/SlotPicker";
import { NotCrisisNotice } from "@/components/NotCrisisNotice";

export const metadata: Metadata = { title: "Move an appointment", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReschedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { clientId } = await requirePortalClient();
  if (!UUID.test(id)) notFound();

  // Scoped to the signed-in client, so another client's id is simply not found.
  const [appt] = await getDb()
    .select({ id: appointments.id, startsAt: appointments.startsAt, status: appointments.status })
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.clientId, clientId)))
    .limit(1);
  if (!appt) notFound();
  await requireClientAccess(clientId, { entity: "appointments", entityId: id, action: "view" });

  const movable = canReschedule({ startsAt: appt.startsAt, status: appt.status });
  const groups = movable ? groupSlotsByDay(await getPooledSlots({ clientId, excludeAppointmentId: id })) : [];

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 72px" }}>
      <Link href="/portal/appointments" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--teal-deep)" }}>
        ← Your appointments
      </Link>
      <h1 style={{ margin: "14px 0 8px", fontSize: "clamp(24px,4.6vw,30px)", fontWeight: 800, color: "var(--navy)" }}>
        Move your appointment
      </h1>
      <p style={{ margin: "0 0 26px", fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
        Currently booked for <strong>{formatAppointment(appt.startsAt)}</strong>. Choose a new time below — your
        current appointment stays in place until the new one is confirmed. Times are shown in UK time.
      </p>

      {!movable ? (
        <div className="card" style={{ padding: 32 }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
            {appt.status === "scheduled"
              ? "Appointments can be moved up to 24 hours beforehand. "
              : "This appointment is no longer booked. "}
            <Link href="/portal/messages" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
              Message us
            </Link>{" "}
            if you need help.
          </p>
        </div>
      ) : groups.length === 0 ? (
        <div className="card" style={{ padding: 32 }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
            There are no other times available at the moment.{" "}
            <Link href="/portal/messages" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
              Send us a message
            </Link>{" "}
            and we&apos;ll arrange one with you.
          </p>
        </div>
      ) : (
        <SlotPicker groups={groups} rescheduleId={id} />
      )}

      <NotCrisisNotice style={{ marginTop: 30 }} />
    </div>
  );
}
