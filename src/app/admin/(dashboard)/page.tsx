import type { Metadata } from "next";
import { requireCapability } from "@/lib/guard";
import { getDb } from "@/db";
import { clients, enquiries, appointments, safeguardingConcerns } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import Link from "next/link";

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
  await requireCapability("client:read:any", {
    entity: "admin_dashboard",
    action: "view",
    detail: "opened admin dashboard",
  });

  const db = getDb();
  const [[clientCount], [openEnquiries], [upcoming], [openConcerns]] = await Promise.all([
    db.select({ n: count() }).from(clients),
    db.select({ n: count() }).from(enquiries).where(eq(enquiries.status, "new")),
    db.select({ n: count() }).from(appointments).where(eq(appointments.status, "scheduled")),
    db
      .select({ n: count() })
      .from(safeguardingConcerns)
      .where(eq(safeguardingConcerns.status, "open")),
  ]);

  const tiles = [
    { label: "Clients", value: clientCount.n },
    { label: "New enquiries", value: openEnquiries.n },
    { label: "Upcoming appointments", value: upcoming.n },
    { label: "Open safeguarding concerns", value: openConcerns.n },
  ];

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 30, fontWeight: 800, color: "var(--navy)" }}>
        Dashboard
      </h1>
      <p style={{ margin: "0 0 28px", fontSize: 15, color: "var(--navy-soft)" }}>
        Every record opened from here is written to the access log.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }} className="impact-row">
        {tiles.map((t) => (
          <div key={t.label} className="card" style={{ padding: "20px 18px" }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: "var(--teal-deep)" }}>{t.value}</div>
            <div style={{ fontSize: 13, color: "var(--navy-soft)", marginTop: 4 }}>{t.label}</div>
          </div>
        ))}
      </div>
      <p style={{ margin: "26px 0 0", fontSize: 14.5 }}>
        <Link href="/admin/clients" style={{ color: "var(--teal-deep)", fontWeight: 700, textDecoration: "none" }}>
          View all clients →
        </Link>
      </p>
    </main>
  );
}
