import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { requirePortalClient } from "@/lib/portal-guard";
import { requireClientAccess } from "@/lib/guard";
import { getDb } from "@/db";
import { appointments, packages, users } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";
import {
  RESCHEDULED_REASON,
  appointmentKinds,
  canReschedule,
  cancellationOutcome,
  sessionsRemaining,
} from "@/lib/allocation";
import { formatAppointment } from "@/lib/slot-groups";
import { CancelAppointment } from "@/components/portal/CancelAppointment";
import { NotCrisisNotice } from "@/components/NotCrisisNotice";

export const metadata: Metadata = { title: "Your appointments", robots: { index: false, follow: false } };

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Booked",
  completed: "Attended",
  cancelled_by_client: "Cancelled by you",
  cancelled_by_service: "Cancelled by us",
  no_show: "Missed",
};

function joinLink(encrypted: string | null): string | null {
  if (!encrypted) return null;
  try {
    return decryptSecret(encrypted);
  } catch (err) {
    console.error("[portal] could not decrypt meeting link", err);
    return null;
  }
}

/** What cancelling will mean, from the same rule the cancel action applies. */
function cancelWarning(startsAt: Date, hasPackage: boolean, now: Date): string {
  const outcome = cancellationOutcome({ startsAt, status: "scheduled", now });
  if (outcome.allowed && outcome.late) {
    return "This appointment is less than 24 hours away, so if you cancel now the session counts as used. If this is an emergency, please message us first — we will be fair.";
  }
  return hasPackage
    ? "With 24 hours' notice or more there is no charge — the session goes back to your account to use again."
    : "With 24 hours' notice or more there is no charge.";
}

export default async function AppointmentsPage() {
  const { clientId } = await requirePortalClient();
  await requireClientAccess(clientId, { entity: "appointments", action: "view" });

  const db = getDb();
  const [rows, owned] = await Promise.all([
    db
      .select({
        id: appointments.id,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
        cancellationReason: appointments.cancellationReason,
        packageId: appointments.packageId,
        meetingLinkEncrypted: appointments.meetingLinkEncrypted,
        practitioner: users.displayName,
      })
      .from(appointments)
      .leftJoin(users, eq(users.id, appointments.practitionerId))
      .where(eq(appointments.clientId, clientId)),
    db.select().from(packages).where(eq(packages.clientId, clientId)),
  ]);

  const now = new Date();
  const kinds = appointmentKinds(rows);
  const upcoming = rows
    .filter((a) => a.status === "scheduled" && a.endsAt > now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = rows
    .filter((a) => !upcoming.includes(a))
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  const remaining = sessionsRemaining(owned, now);
  const livePackages = owned.filter((p) => p.sessionsTotal > 1 && p.status === "active");

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 72px" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: "clamp(24px,4.6vw,30px)", fontWeight: 800, color: "var(--navy)" }}>
        Your appointments
      </h1>
      <p style={{ margin: "0 0 28px", fontSize: 15, lineHeight: 1.6, color: "var(--navy-soft)" }}>
        Times are shown in UK time. Your joining link is only ever shown here, never in an email.
      </p>

      <section className="card" style={{ padding: 24, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 17, color: "var(--navy)" }}>Upcoming</h2>
          <Link href="/portal/book" className="pill pill-gold" style={{ padding: "9px 18px", fontSize: 13.5 }}>
            Book a session
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)" }}>
            You have no upcoming appointments.{" "}
            <Link href="/portal/book" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
              Choose a time
            </Link>{" "}
            whenever you&apos;re ready.
          </p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
            {upcoming.map((a) => {
              const link = joinLink(a.meetingLinkEncrypted);
              const movable = canReschedule({ startsAt: a.startsAt, status: a.status, now });
              const started = a.startsAt <= now;
              return (
                <li key={a.id} style={{ padding: 16, borderRadius: 12, border: "1px solid rgba(31,58,95,0.12)", background: "#fff" }}>
                  <div style={{ fontSize: 15.5, fontWeight: 800, color: "var(--navy)" }}>{formatAppointment(a.startsAt)}</div>
                  <div style={{ marginTop: 3, fontSize: 13.5, color: "var(--navy-soft)" }}>
                    {kinds.get(a.id)} · with {a.practitioner ?? "your practitioner"} · online
                  </div>

                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    {link ? (
                      <a href={link} target="_blank" rel="noopener noreferrer" className="pill pill-teal" style={{ padding: "9px 18px", fontSize: 13.5 }}>
                        Join session
                      </a>
                    ) : (
                      <span style={{ fontSize: 13.5, color: "var(--navy-soft)" }}>
                        Your joining link will appear here before the session.
                      </span>
                    )}
                    {movable ? (
                      <Link href={`/portal/appointments/${a.id}/reschedule`} style={{ fontSize: 13.5, fontWeight: 700, color: "var(--teal-deep)" }}>
                        Reschedule
                      </Link>
                    ) : (
                      !started && (
                        <span style={{ fontSize: 13, color: "var(--navy-soft)" }}>
                          Less than 24 hours away —{" "}
                          <Link href="/portal/messages" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>message us</Link>{" "}
                          to change it.
                        </span>
                      )
                    )}
                    {!started && <CancelAppointment appointmentId={a.id} warning={cancelWarning(a.startsAt, !!a.packageId, now)} />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card" style={{ padding: 24, marginBottom: 18 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 17, color: "var(--navy)" }}>Sessions remaining</h2>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)" }}>
          {remaining > 0
            ? `You have ${remaining} prepaid session${remaining === 1 ? "" : "s"} to book.`
            : "You have no prepaid sessions."}{" "}
          <Link href="/portal/purchase" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
            Buy sessions
          </Link>
        </p>
        {livePackages.length > 0 && (
          <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {livePackages.map((p) => (
              <li key={p.id} style={{ fontSize: 13.5, color: "var(--navy-soft)" }}>
                {p.sessionsTotal}-session package: {p.sessionsTotal - p.sessionsUsed} of {p.sessionsTotal} left
                {p.expiresAt ? `, use by ${p.expiresAt.toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "long", year: "numeric" })}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="card" style={{ padding: 24 }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 17, color: "var(--navy)" }}>Past and cancelled</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {past.map((a) => (
              <li key={a.id} style={{ fontSize: 14, color: "var(--ink)" }}>
                <strong style={{ color: "var(--navy)" }}>{formatAppointment(a.startsAt)}</strong> —{" "}
                {a.cancellationReason === RESCHEDULED_REASON
                  ? "moved to a new time"
                  : a.status.startsWith("cancelled")
                    ? STATUS_LABEL[a.status]
                    : `${kinds.get(a.id)}, ${STATUS_LABEL[a.status]?.toLowerCase() ?? a.status}`}
              </li>
            ))}
          </ul>
        </section>
      )}

      <NotCrisisNotice style={{ marginTop: 26 }} />
    </div>
  );
}
