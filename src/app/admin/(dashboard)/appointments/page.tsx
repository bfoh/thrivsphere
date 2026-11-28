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
import { Badge, PageHeader, TableWrap, Tabs, type Tone } from "@/components/admin/ui";
import { clock, dayHeading, LDN, ukDate, ukWeek } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Appointments", robots: { index: false, follow: false } };

const STATUS: Record<string, { label: string; tone: Tone }> = {
  scheduled: { label: "Booked", tone: "info" },
  completed: { label: "Attended", tone: "ok" },
  no_show: { label: "No-show", tone: "warn" },
  cancelled_by_client: { label: "Cancelled by client", tone: "neutral" },
  cancelled_by_service: { label: "Cancelled by us", tone: "neutral" },
};

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; layout?: string; week?: string }>;
}) {
  const actor = await requireCapability("appointment:manage:any", {
    entity: "appointments",
    action: "view",
    detail: "viewed appointments",
  });

  const db = getDb();
  const sp = await searchParams;
  const mine = sp.view === "mine";
  const weekView = sp.layout === "week";
  const offset = Math.max(-104, Math.min(104, Number.parseInt(sp.week ?? "0", 10) || 0));
  const staff = await getActiveStaff();
  const nameOf = new Map(staff.map((s) => [s.id, s.name]));
  const withWhom = (id: string) => (id === actor.userId ? "you" : (nameOf.get(id) ?? "a former colleague"));

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
  const week = ukWeek(cutoff, offset);
  const scope = (where: SQL | undefined) =>
    mine ? and(eq(appointments.practitionerId, actor.userId), where) : where;

  const [upcoming, past, inWeek] = await Promise.all([
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
    weekView
      ? db
          .select(base)
          .from(appointments)
          .leftJoin(clients, eq(clients.id, appointments.clientId))
          .where(
            scope(
              and(
                gte(appointments.startsAt, week.from),
                lt(appointments.startsAt, week.to),
                ne(appointments.status, "pending_payment")
              )
            )
          )
          .orderBy(appointments.startsAt)
      : Promise.resolve([]),
  ]);
  // Ended but never marked: these get the buttons, the rest are history.
  const toClose = past.filter((a) => a.status === "scheduled").reverse();
  const closed = past.filter((a) => a.status !== "scheduled");

  const href = (o: { mine?: boolean; week?: boolean; offset?: number }) => {
    const q = new URLSearchParams();
    if (o.mine ?? mine) q.set("view", "mine");
    if (o.week ?? weekView) {
      q.set("layout", "week");
      const w = o.offset ?? offset;
      if (w) q.set("week", String(w));
    }
    const s = q.toString();
    return s ? `/admin/appointments?${s}` : "/admin/appointments";
  };

  // Upcoming, grouped by UK calendar day.
  const days: { date: string; items: typeof upcoming }[] = [];
  for (const a of upcoming) {
    const date = ukDate(a.startsAt);
    const last = days.at(-1);
    if (last?.date === date) last.items.push(a);
    else days.push({ date, items: [a] });
  }

  return (
    <div className="adm-page">
      <PageHeader
        title="Appointments"
        description={`Times are UK time. ${upcoming.length} upcoming${mine ? " with you" : ""}.`}
        actions={
          <>
            <Tabs
              label="Layout"
              items={[
                { label: "Agenda", href: href({ week: false }), active: !weekView },
                { label: "Week", href: href({ week: true, offset: 0 }), active: weekView },
              ]}
            />
            <Tabs
              label="Whose appointments"
              items={[
                { label: "All", href: href({ mine: false }), active: !mine },
                { label: "Mine", href: href({ mine: true }), active: mine },
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
          <ul className="adm-agenda">
            {toClose.map((a) => (
              <li key={a.id} className="adm-agenda-row">
                <div className="adm-agenda-time">
                  <strong>{a.startsAt.toLocaleDateString("en-GB", { timeZone: LDN, day: "numeric", month: "short" })}</strong>
                  <span>{clock(a.startsAt)}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <ClientName a={a} />
                  <div className="adm-agenda-meta">
                    {kindLabel(a.kind)} · with {withWhom(a.practitionerId)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 10 }}>
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
              </li>
            ))}
          </ul>
        </Section>
      )}

      {weekView ? (
        <Section
          title={`Week of ${week.from.toLocaleDateString("en-GB", { timeZone: LDN, day: "numeric", month: "long", year: "numeric" })}`}
          subtitle={`${inWeek.length} ${inWeek.length === 1 ? "appointment" : "appointments"}`}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <Link href={href({ offset: offset - 1 })} className="pill pill-ghost" style={{ minHeight: 34, padding: "0 12px", fontSize: 13 }}>
              ← Previous week
            </Link>
            {offset !== 0 && (
              <Link href={href({ offset: 0 })} className="pill pill-ghost" style={{ minHeight: 34, padding: "0 12px", fontSize: 13 }}>
                This week
              </Link>
            )}
            <Link href={href({ offset: offset + 1 })} className="pill pill-ghost" style={{ minHeight: 34, padding: "0 12px", fontSize: 13 }}>
              Next week →
            </Link>
          </div>
          <div className="adm-week">
            {week.days.map((date) => {
              const items = inWeek.filter((a) => ukDate(a.startsAt) === date);
              const isToday = date === ukDate(cutoff);
              const noon = new Date(`${date}T12:00:00Z`);
              return (
                <div key={date} className="adm-week-day" data-today={isToday || undefined}>
                  <div className="adm-week-head">
                    <span>{noon.toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short" })}</span>
                    <strong>{noon.toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short" })}</strong>
                  </div>
                  {items.length === 0 ? (
                    <p className="adm-week-none">—</p>
                  ) : (
                    items.map((a) => (
                      <Link
                        key={a.id}
                        href={a.clientId ? `/admin/clients/${a.clientId}` : "/admin/appointments"}
                        className="adm-week-item"
                        data-status={a.status}
                      >
                        <strong>{clock(a.startsAt)}</strong>
                        <span>{a.clientName ?? "Unknown client"}</span>
                        <small>
                          {kindLabel(a.kind)} · {withWhom(a.practitionerId)}
                          {a.status !== "scheduled" && ` · ${STATUS[a.status]?.label ?? a.status}`}
                        </small>
                      </Link>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      ) : (
        <Section title="Upcoming" subtitle={`${upcoming.length} booked`}>
          {upcoming.length === 0 ? (
            <Empty>Nothing booked.</Empty>
          ) : (
            days.map((day) => (
              <div key={day.date} className="adm-agenda-day">
                <h3 className="adm-agenda-heading">{dayHeading(day.date, cutoff)}</h3>
                <ul className="adm-agenda">
                  {day.items.map((a) => (
                    <li key={a.id} className="adm-agenda-row">
                      <div className="adm-agenda-time">
                        <strong>{clock(a.startsAt)}</strong>
                        <span>to {clock(a.endsAt)}</span>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <ClientName a={a} />
                        <div className="adm-agenda-meta">
                          {kindLabel(a.kind)} · with {withWhom(a.practitionerId)}
                          {!a.meetingLinkEncrypted && " · no meeting link yet"}
                        </div>
                        <details className="adm-manage">
                          <summary>Manage</summary>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 10 }}>
                            <StatusButtons appointmentId={a.id} />
                            <MeetingLinkForm appointmentId={a.id} hasLink={!!a.meetingLinkEncrypted} />
                            {staff.length > 1 && (
                              <ReassignForm appointmentId={a.id} currentPractitionerId={a.practitionerId} staff={staff} />
                            )}
                          </div>
                        </details>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </Section>
      )}

      <Section title="Past & closed" subtitle={`${closed.length} shown, newest first`}>
        {closed.length === 0 ? (
          <Empty>Nothing yet.</Empty>
        ) : (
          <TableWrap>
            <table className="adm-table" data-stack>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Client</th>
                  <th scope="col">Session</th>
                  <th scope="col">With</th>
                  <th scope="col">Outcome</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {closed.map((a) => (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: "nowrap", fontWeight: 600, color: "var(--navy)" }}>
                      {a.startsAt.toLocaleDateString("en-GB", { timeZone: LDN, day: "numeric", month: "short", year: "numeric" })}, {clock(a.startsAt)}
                    </td>
                    <td data-label="Client">
                      {a.clientId ? (
                        <Link href={`/admin/clients/${a.clientId}`} style={{ fontWeight: 700, color: "var(--navy)", textDecoration: "none" }}>
                          {a.clientName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-label="Session">{kindLabel(a.kind)}</td>
                    <td data-label="With">{withWhom(a.practitionerId)}</td>
                    <td data-label="Outcome">
                      <Badge tone={STATUS[a.status]?.tone ?? "neutral"}>{STATUS[a.status]?.label ?? a.status.replace(/_/g, " ")}</Badge>
                      {a.chargedToPackage && (
                        <span style={{ display: "block", marginTop: 4, fontSize: 12, color: "var(--navy-soft)" }}>counted as used</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {a.chargedToPackage && <ReturnSessionButton appointmentId={a.id} />}
                        {/* Opens the session's existing sheet if there is one. */}
                        {a.clientId && a.status === "completed" && (
                          <Link
                            href={`/admin/clients/${a.clientId}/supervision/new?appointment=${a.id}`}
                            style={{ fontSize: 13, fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none", whiteSpace: "nowrap" }}
                          >
                            Supervision sheet
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Section>
    </div>
  );
}

function ClientName({ a }: { a: { clientId: string | null; clientName: string | null } }) {
  return a.clientId ? (
    <Link href={`/admin/clients/${a.clientId}`} style={{ fontWeight: 700, color: "var(--navy)", textDecoration: "none" }}>
      {a.clientName}
    </Link>
  ) : (
    <span style={{ color: "var(--navy-soft)" }}>Unknown client</span>
  );
}
