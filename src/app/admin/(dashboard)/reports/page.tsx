import type { Metadata } from "next";
import Link from "next/link";
import { getReport, monthRange } from "@/lib/queries/reports";
import { Section } from "@/components/admin/RecordUI";

export const metadata: Metadata = { title: "Reports", robots: { index: false, follow: false } };

const money = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

function Tile({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: "var(--teal-deep)" }}>{value}</div>
      <div style={{ fontSize: 13, color: "var(--navy)", fontWeight: 700, marginTop: 3 }}>{label}</div>
      {note && <div style={{ fontSize: 11.5, color: "var(--navy-soft)", marginTop: 3, lineHeight: 1.45 }}>{note}</div>}
    </div>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const monthsAgo = Math.min(Math.max(Number(m ?? 0) || 0, 0), 23);
  const report = await getReport(monthRange(monthsAgo));

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 24px 72px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "var(--navy)" }}>Reports</h1>
        <div style={{ display: "flex", gap: 12, fontSize: 13.5 }}>
          {monthsAgo < 23 && (
            <Link href={`/admin/reports?m=${monthsAgo + 1}`} style={{ color: "var(--teal-deep)", fontWeight: 700, textDecoration: "none" }}>
              ← Earlier
            </Link>
          )}
          {monthsAgo > 0 && (
            <Link href={`/admin/reports?m=${monthsAgo - 1}`} style={{ color: "var(--teal-deep)", fontWeight: 700, textDecoration: "none" }}>
              Later →
            </Link>
          )}
        </div>
      </div>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--navy-soft)" }}>
        {report.range.label} · totals only, so producing a report never requires opening a client record.
      </p>

      <Section title="Service activity">
        <div className="impact-row" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          <Tile label="New clients" value={report.newClients} />
          <Tile label="Active clients" value={report.activeClients} note="current, not period-based" />
          <Tile label="Sessions delivered" value={report.sessionsDelivered} />
          <Tile
            label="Attendance"
            value={report.attendanceRate === null ? "—" : `${report.attendanceRate}%`}
            note="delivered vs no-shows; cancellations excluded"
          />
        </div>
      </Section>

      <Section title="Bookings & income">
        <div className="impact-row" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          <Tile label="Sessions booked" value={report.sessionsBooked} />
          <Tile label="Cancellations" value={report.cancellations} />
          <Tile label="No-shows" value={report.noShows} />
          <Tile label="Income" value={money(report.incomePence)} note="paid orders in period" />
        </div>
      </Section>

      <Section title="Safeguarding & signposting">
        <div className="impact-row" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          <Tile label="Concerns raised" value={report.concernsRaised} />
          <Tile label="Of those, escalated" value={report.concernsEscalated} />
          <Tile label="Referrals made" value={report.referralsMade} />
          <Tile label="New enquiries" value={report.newEnquiries} />
        </div>
        <p style={{ margin: "16px 0 0", fontSize: 12.5, lineHeight: 1.6, color: "var(--navy-soft)" }}>
          These are counts for oversight and funding reports. Individual concerns are on the{" "}
          <Link href="/admin/safeguarding" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
            safeguarding register
          </Link>
          , and opening one is logged.
        </p>
      </Section>
    </div>
  );
}
