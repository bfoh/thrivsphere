import type { Metadata } from "next";
import { requireCapability } from "@/lib/guard";
import { can } from "@/lib/authz";
import { getDb } from "@/db";
import { clients, enquiries, appointments, safeguardingConcerns } from "@/db/schema";
import { count, eq, ne } from "drizzle-orm";
import Link from "next/link";
import { countResourceWork } from "@/lib/queries/worksheets";
import { listOutcomesDue } from "@/lib/queries/suitability";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * Admin landing.
 *
 * Reached only by staff: `proxy.ts` requires a session, and this guard call
 * requires the capability and writes the audit row. Both checks are deliberate
 * — the proxy is path-based and this one is not.
 */
export default async function AdminPage() {
  const actor = await requireCapability("client:read:any", {
    entity: "admin_dashboard",
    action: "view",
    detail: "opened admin dashboard",
  });

  const db = getDb();
  const [[clientCount], [openEnquiries], [upcoming], [openConcerns], resourceWork, outcomesDue] = await Promise.all([
    db.select({ n: count() }).from(clients),
    db.select({ n: count() }).from(enquiries).where(eq(enquiries.status, "new")),
    db.select({ n: count() }).from(appointments).where(eq(appointments.status, "scheduled")),
    db
      .select({ n: count() })
      .from(safeguardingConcerns)
      .where(ne(safeguardingConcerns.status, "closed")),
    countResourceWork(actor.userId),
    listOutcomesDue(),
  ]);

  const tiles: { label: string; value: number; href?: string }[] = [
    { label: "Clients", value: clientCount.n, href: "/admin/clients" },
    // Linked only for those who can work the queue.
    { label: "New enquiries", value: openEnquiries.n, href: can(actor, "enquiry:manage") ? "/admin/enquiries" : undefined },
    { label: "Upcoming appointments", value: upcoming.n, href: "/admin/appointments" },
    { label: "Open safeguarding concerns", value: openConcerns.n, href: "/admin/safeguarding" },
    { label: "Worksheets to review", value: resourceWork.worksheetsToReview, href: "/admin/resources" },
    { label: "My preparation tasks", value: resourceWork.myOpenTasks, href: "/admin/resources" },
  ];

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 30, fontWeight: 800, color: "var(--navy)" }}>
        Dashboard
      </h1>
      <p style={{ margin: "0 0 28px", fontSize: 15, color: "var(--navy-soft)" }}>
        Every record opened from here is written to the access log.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }} className="impact-row">
        {tiles.map((t) => {
          const body = (
            <>
              <div style={{ fontSize: 30, fontWeight: 800, color: "var(--teal-deep)" }}>{t.value}</div>
              <div style={{ fontSize: 13, color: "var(--navy-soft)", marginTop: 4 }}>{t.label}</div>
            </>
          );
          return t.href ? (
            <Link key={t.label} href={t.href} className="card" style={{ padding: "20px 18px", textDecoration: "none", display: "block" }}>
              {body}
            </Link>
          ) : (
            <div key={t.label} className="card" style={{ padding: "20px 18px" }}>
              {body}
            </div>
          );
        })}
      </div>
      {/*
        Ongoing sessions stay closed until a decision is recorded (IT
        handover §13.1), so a missing one leaves a client waiting.
      */}
      {outcomesDue.length > 0 && (
        <section className="card" style={{ marginTop: 22, padding: "20px 22px" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 17, color: "var(--navy)" }}>Consultation outcomes to record</h2>
          <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "var(--navy-soft)" }}>
            These clients have had their Initial Wellbeing Consultation. They can book ongoing sessions once the
            outcome is recorded as Suitable.
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {outcomesDue.map((o) => (
              <li key={o.clientId} style={{ fontSize: 14 }}>
                <Link href={`/admin/clients/${o.clientId}`} style={{ color: "var(--teal-deep)", fontWeight: 700, textDecoration: "none" }}>
                  {o.name}
                </Link>
                <span style={{ color: "var(--navy-soft)" }}>
                  {" "}
                  · consultation{" "}
                  {o.consultedAt.toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p style={{ margin: "26px 0 0", fontSize: 14.5 }}>
        <Link href="/admin/clients" style={{ color: "var(--teal-deep)", fontWeight: 700, textDecoration: "none" }}>
          View all clients →
        </Link>
      </p>
    </main>
  );
}
