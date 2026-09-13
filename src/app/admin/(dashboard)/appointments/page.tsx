import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, gte, lt, or, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, clients } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { Section, Empty } from "@/components/admin/RecordUI";
import { StatusButtons, MeetingLinkForm } from "@/components/admin/AppointmentActions";

export const metadata: Metadata = { title: "Appointments", robots: { index: false, follow: false } };

const LDN = "Europe/London";

export default async function AppointmentsPage() {
  await requireCapability("appointment:manage:any", {
    entity: "appointments",
    action: "view",
    detail: "viewed appointments",
  });

  const db = getDb();

  const base = {
    id: appointments.id,
    startsAt: appointments.startsAt,
    endsAt: appointments.endsAt,
    status: appointments.status,
    meetingLinkEncrypted: appointments.meetingLinkEncrypted,
    chargedToPackage: appointments.chargedToPackage,
    clientId: clients.id,
    clientName: clients.preferredName,
  };

  // Split in SQL rather than filtering in render: a server component should
  // not branch on a clock reading taken mid-render.
  const cutoff = new Date();

  const [upcoming, past] = await Promise.all([
    db
      .select(base)
      .from(appointments)
      .leftJoin(clients, eq(clients.id, appointments.clientId))
      .where(and(eq(appointments.status, "scheduled"), gte(appointments.startsAt, cutoff)))
      .orderBy(appointments.startsAt)
      .limit(100),
    db
      .select(base)
      .from(appointments)
      .leftJoin(clients, eq(clients.id, appointments.clientId))
      .where(or(ne(appointments.status, "scheduled"), lt(appointments.startsAt, cutoff)))
      .orderBy(desc(appointments.startsAt))
      .limit(100),
  ]);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "36px 24px 72px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "var(--navy)" }}>Appointments</h1>
        <Link href="/admin/availability" style={{ fontSize: 14, fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none" }}>
          Manage availability →
        </Link>
      </div>

      <Section title="Upcoming" subtitle={`${upcoming.length} scheduled`}>
        {upcoming.length === 0 ? (
          <Empty>Nothing booked.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {upcoming.map((a) => (
              <div key={a.id} style={{ border: "1px solid rgba(31,58,95,0.1)", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                  <strong style={{ fontSize: 15, color: "var(--navy)" }}>
                    {a.startsAt.toLocaleString("en-GB", { timeZone: LDN, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </strong>
                  {a.clientId ? (
                    <Link href={`/admin/clients/${a.clientId}`} style={{ fontSize: 14, fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none" }}>
                      {a.clientName}
                    </Link>
                  ) : (
                    <span style={{ fontSize: 14, color: "var(--navy-soft)" }}>Unknown client</span>
                  )}
                </div>
                <StatusButtons appointmentId={a.id} />
                <MeetingLinkForm appointmentId={a.id} hasLink={!!a.meetingLinkEncrypted} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Past & closed" subtitle={`${past.length} shown`}>
        {past.length === 0 ? (
          <Empty>Nothing yet.</Empty>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
            {past.map((a) => (
              <li key={a.id} style={{ fontSize: 14, color: "var(--ink)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span style={{ minWidth: 190, color: "var(--navy)", fontWeight: 600 }}>
                  {a.startsAt.toLocaleString("en-GB", { timeZone: LDN, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span>{a.clientName ?? "—"}</span>
                <span style={{ color: "var(--navy-soft)" }}>{a.status.replace(/_/g, " ")}{a.chargedToPackage ? " · charged" : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
