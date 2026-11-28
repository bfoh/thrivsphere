import type { Metadata } from "next";
import { requireCapability } from "@/lib/guard";
import { can } from "@/lib/authz";
import { getDb } from "@/db";
import { clients, enquiries, appointments, safeguardingConcerns } from "@/db/schema";
import { count, eq, ne } from "drizzle-orm";
import Link from "next/link";
import { countResourceWork } from "@/lib/queries/worksheets";
import { listOutcomesDue } from "@/lib/queries/suitability";
import { Card, Page, PageHeader, Stat, Stats } from "@/components/admin/ui";

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

  const tiles: { label: string; value: number; href?: string; tone?: "danger" }[] = [
    { label: "Clients", value: clientCount.n, href: "/admin/clients" },
    // Linked only for those who can work the queue.
    { label: "New enquiries", value: openEnquiries.n, href: can(actor, "enquiry:manage") ? "/admin/enquiries" : undefined },
    { label: "Upcoming appointments", value: upcoming.n, href: "/admin/appointments" },
    { label: "Open safeguarding concerns", value: openConcerns.n, href: "/admin/safeguarding", tone: openConcerns.n > 0 ? "danger" : undefined },
    { label: "Worksheets to review", value: resourceWork.worksheetsToReview, href: "/admin/resources" },
    { label: "My preparation tasks", value: resourceWork.myOpenTasks, href: "/admin/resources" },
  ];

  return (
    <Page>
      <PageHeader title="Dashboard" description="Every record opened from here is written to the access log." />

      <Stats>
        {tiles.map((t) => (
          <Stat key={t.label} label={t.label} value={t.value} href={t.href} tone={t.tone} />
        ))}
      </Stats>

      {/*
        Ongoing sessions stay closed until a decision is recorded (IT
        handover §13.1), so a missing one leaves a client waiting.
      */}
      {outcomesDue.length > 0 && (
        <Card
          title="Consultation outcomes to record"
          subtitle="These clients have had their Initial Wellbeing Consultation. They can book ongoing sessions once the outcome is recorded as Suitable."
          style={{ marginTop: 24 }}
        >
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {outcomesDue.map((o) => (
              <li key={o.clientId}>
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
        </Card>
      )}

      <p style={{ margin: "24px 0 0" }}>
        <Link href="/admin/clients" style={{ color: "var(--teal-deep)", fontWeight: 700, textDecoration: "none" }}>
          View all clients →
        </Link>
      </p>
    </Page>
  );
}
