import type { Metadata } from "next";
import Link from "next/link";
import { getOutcomeSeries, getReport, monthRange } from "@/lib/queries/reports";
import { Section } from "@/components/admin/RecordUI";
import { ColumnChart } from "@/components/admin/ColumnChart";
import { PageHeader, Stat, Stats } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Reports", robots: { index: false, follow: false } };

const money = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

const step = { minHeight: 38, padding: "0 14px", fontSize: 13.5 } as const;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const monthsAgo = Math.min(Math.max(Number(m ?? 0) || 0, 0), 23);
  // The report first: it checks access and writes the audit row for the page.
  const report = await getReport(monthRange(monthsAgo));
  const outcomes = await getOutcomeSeries(monthsAgo, 6);
  const anySessions = outcomes.some((o) => o.attended + o.noShows + o.cancelled > 0);

  return (
    <div className="adm-page">
      <PageHeader
        title="Reports"
        description={`${report.range.label} · totals only, so producing a report never requires opening a client record.`}
        actions={
          <>
            {monthsAgo < 23 && (
              <Link href={`/admin/reports?m=${monthsAgo + 1}`} className="pill pill-ghost" style={step}>
                ← Earlier
              </Link>
            )}
            {monthsAgo > 0 && (
              <Link href={`/admin/reports?m=${monthsAgo - 1}`} className="pill pill-ghost" style={step}>
                Later →
              </Link>
            )}
          </>
        }
      />

      <Section title="Service activity">
        <Stats>
          <Stat label="New clients" value={report.newClients} />
          <Stat label="Active clients" value={report.activeClients} hint="Now, not for the month" />
          <Stat label="Sessions delivered" value={report.sessionsDelivered} />
          <Stat
            label="Attendance"
            value={report.attendanceRate === null ? "—" : `${report.attendanceRate}%`}
            hint="Attended against no-shows; cancellations left out"
          />
        </Stats>
      </Section>

      <Section title="Sessions by month" subtitle={`Six months to ${report.range.label}. Cancellations are in the tooltip and the figures.`}>
        {anySessions ? (
          <ColumnChart
            label={`Attended and missed sessions, six months to ${report.range.label}`}
            series={["Attended", "No-show"]}
            extra={["Cancelled"]}
            integer
            format={String}
            height={200}
            columns={outcomes.map((o, i) => ({
              key: o.key,
              label: o.label.split(" ")[0].slice(0, 3),
              fullLabel: o.label,
              values: [o.attended, o.noShows],
              extras: [o.cancelled],
              current: i === outcomes.length - 1,
            }))}
          />
        ) : (
          <p className="adm-empty">No sessions marked as attended, missed or cancelled in these six months.</p>
        )}
      </Section>

      <Section title="Bookings & income">
        <Stats>
          <Stat label="Sessions booked" value={report.sessionsBooked} />
          <Stat label="Cancellations" value={report.cancellations} />
          <Stat label="No-shows" value={report.noShows} />
          <Stat label="Income" value={money(report.incomePence)} hint="Paid orders in the month" />
        </Stats>
      </Section>

      <Section title="Safeguarding & signposting">
        <Stats>
          <Stat label="Concerns raised" value={report.concernsRaised} />
          <Stat label="Of those, escalated" value={report.concernsEscalated} />
          <Stat label="Referrals made" value={report.referralsMade} />
          <Stat label="New enquiries" value={report.newEnquiries} />
        </Stats>
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
