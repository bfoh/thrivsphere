import type { Metadata } from "next";
import Link from "next/link";
import { kindLabel } from "@/lib/allocation";
import { and, desc, eq, gte, lt, ne, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, clients } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { Section, Empty } from "@/components/admin/RecordUI";
import { StatusButtons, MeetingLinkForm, ReassignForm, ReturnSessionButton } from "@/components/admin/AppointmentActions";
import { getActiveStaff } from "@/lib/queries/availability";
import { PageHeader, Tabs } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Appointments", robots: { index: false, follow: false } };

const LDN = "Europe/London";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const actor = await requireCapability("appointment:manage:any", {
    entity: "appointments",
    action: "view",
    detail: "viewed appointments",
  });

  const db = getDb();
  const mine = (await searchParams).view === "mine";
  const staff = await getActiveStaff();
  const nameOf = new Map(staff.map((s) => [s.id, s.name]));

  const base = {
    id: appointments.id,
    startsAt: appointments.startsAt,
    endsAt: appointments.endsAt,
    status: appointments.status,
    kind: appointments.kind,
    meetingLinkEncrypted: appointments.meetingLinkEncrypted,
    chargedToPackage: appointments.chargedToPackage,
    practitionerId: appointments.practitionerId,
    clientId: clients.id,
    clientName: clients.preferredName,
  };

  // Split in SQL rather than filtering in render: a server component should
  // not branch on a clock reading taken mid-render.
  const cutoff = new Date();
  const scope = (where: SQL | undefined) =>
    mine ? and(eq(appointments.practitionerId, actor.userId), where) : where;

  const [upcoming, past] = await Promise.all([
    db
      .select(base)
      .from(appointments)
      .leftJoin(clients, eq(clients.id, appointments.clientId))
      .where(scope(and(eq(appointments.status, "scheduled"), gte(appointments.startsAt, cutoff))))
      .orderBy(appointments.startsAt)
      .limit(100),
    db
      .select(base)
      .from(appointments)
      .leftJoin(clients, eq(clients.id, appointments.clientId))
      // A time still being paid for is neither booked nor closed.
      .where(
        scope(
          and(
            ne(appointments.status, "pending_payment"),
            or(ne(appointments.status, "scheduled"), lt(appointments.startsAt, cutoff))
          )
        )
      )
      .orderBy(desc(appointments.startsAt))
      .limit(100),
  ]);
  // Ended but never marked: these get the buttons, the rest are history.
  const toClose = past.filter((a) => a.status === "scheduled").reverse();
  const closed = past.filter((a) => a.status !== "scheduled");

  return (
    <div className="adm-page">
      <PageHeader
        title="Appointments"
        actions={
          <>
            <Tabs
              label="Whose appointments"
              items={[
                { label: "All", href: "/admin/appointments", active: !mine },
                { label: "Mine", href: "/admin/appointments?view=mine", active: mine },
              ]}
            />
            <Link href="/admin/availability" className="pill pill-ghost" style={{ padding: "0 14px", minHeight: 38, fontSize: 13.5 }}>
              Manage availability
            </Link>
          </>
        }
      />

      {/*
        A session that has ended stays "scheduled" until someone says what
        happened, and until then it counts neither as attended nor missed —
        in sessions used, attendance or the reports. It used to drop into
        "Past & closed" with no way to close it.
      */}
      {toClose.length > 0 && (
        <Section id="to-close" title="To mark" subtitle={`${toClose.length} past ${toClose.length === 1 ? "session" : "sessions"} still marked as booked — say what happened`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {toClose.map((a) => (
              <div key={a.id} style={{ border: "1px solid var(--a-line)", borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                  <strong style={{ color: "var(--navy)" }}>
                    {a.startsAt.toLocaleString("en-GB", { timeZone: LDN, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </strong>
                  {a.clientId ? (
                    <Link href={`/admin/clients/${a.clientId}`} style={{ fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none" }}>
                      {a.clientName}
                    </Link>
                  ) : (
                    <span style={{ color: "var(--navy-soft)" }}>Unknown client</span>
                  )}
                </div>
                <div style={{ margin: "-2px 0 10px", fontSize: 13, color: "var(--navy-soft)" }}>
                  {kindLabel(a.kind)} · with {a.practitionerId === actor.userId ? "you" : nameOf.get(a.practitionerId) ?? "a former colleague"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <StatusButtons appointmentId={a.id} />
                  {a.clientId && (
                    <Link
                      href={`/admin/clients/${a.clientId}/supervision/new?appointment=${a.id}`}
                      style={{ fontSize: 13, fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none" }}
                    >
                      Supervision sheet
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

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
                <div style={{ margin: "-4px 0 10px", fontSize: 13, color: "var(--navy-soft)" }}>
                  {kindLabel(a.kind)} · with {a.practitionerId === actor.userId ? "you" : nameOf.get(a.practitionerId) ?? "a former colleague"}
                </div>
                <StatusButtons appointmentId={a.id} />
                <MeetingLinkForm appointmentId={a.id} hasLink={!!a.meetingLinkEncrypted} />
                {staff.length > 1 && (
                  <ReassignForm appointmentId={a.id} currentPractitionerId={a.practitionerId} staff={staff} />
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Past & closed" subtitle={`${closed.length} shown`}>
        {closed.length === 0 ? (
          <Empty>Nothing yet.</Empty>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
            {closed.map((a) => (
              <li key={a.id} style={{ fontSize: 14, color: "var(--ink)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span style={{ minWidth: 190, color: "var(--navy)", fontWeight: 600 }}>
                  {a.startsAt.toLocaleString("en-GB", { timeZone: LDN, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span>{a.clientName ?? "—"}</span>
                <span style={{ color: "var(--navy-soft)" }}>{kindLabel(a.kind)}</span>
                <span style={{ color: "var(--navy-soft)" }}>{nameOf.get(a.practitionerId) ?? "—"}</span>
                <span style={{ color: "var(--navy-soft)" }}>{a.status.replace(/_/g, " ")}{a.chargedToPackage ? " · counted as used" : ""}</span>
                {a.chargedToPackage && <ReturnSessionButton appointmentId={a.id} />}
                {/* Opens the session's existing sheet if there is one. */}
                {a.clientId && (a.status === "completed" || a.status === "scheduled") && (
                  <Link
                    href={`/admin/clients/${a.clientId}/supervision/new?appointment=${a.id}`}
                    style={{ fontSize: 13, fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none" }}
                  >
                    Supervision sheet
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
