import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import { enquiries, users } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { Section, Empty } from "@/components/admin/RecordUI";
import { OPEN_STATUSES, categoryLabel, statusLabel } from "@/lib/enquiry-rules";

export const metadata: Metadata = { title: "Enquiries", robots: { index: false, follow: false } };

const dt = (v: Date) =>
  v.toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const STATUS_COLOUR: Record<string, string> = {
  new: "#a1421c",
  in_progress: "var(--teal-deep)",
  awaiting_client: "#8a6d12",
};

/**
 * The enquiry and callback queue (IT handover §16.4, §19).
 *
 * Open enquiries first: New, In progress and Awaiting client. Opening the
 * page is logged, like every other confidential list.
 */
export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireCapability("enquiry:manage", { entity: "enquiries", action: "view", detail: "viewed the enquiry queue" });
  const showAll = (await searchParams).show === "all";

  const assignee = alias(users, "assignee");
  const rows = await getDb()
    .select({
      id: enquiries.id,
      reference: enquiries.reference,
      category: enquiries.category,
      name: enquiries.name,
      status: enquiries.status,
      createdAt: enquiries.createdAt,
      clientId: enquiries.clientId,
      assigneeName: assignee.displayName,
      assigneeEmail: assignee.email,
    })
    .from(enquiries)
    .leftJoin(assignee, eq(assignee.id, enquiries.assignedTo))
    .where(showAll ? undefined : inArray(enquiries.status, [...OPEN_STATUSES]))
    .orderBy(desc(enquiries.createdAt))
    .limit(200);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 24px 72px" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 800, color: "var(--navy)" }}>Enquiries</h1>
      <p style={{ margin: "0 0 24px", fontSize: 14, lineHeight: 1.6, color: "var(--navy-soft)" }}>
        Messages from the contact form and callback requests from the Book page. The email ThriveSphere gets
        for each one carries only its reference; the details are here. Everything here is logged.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Link href="/admin/enquiries" className={`pill ${showAll ? "pill-ghost" : "pill-teal"}`} style={{ padding: "8px 16px", fontSize: 13 }}>
          Open
        </Link>
        <Link href="/admin/enquiries?show=all" className={`pill ${showAll ? "pill-teal" : "pill-ghost"}`} style={{ padding: "8px 16px", fontSize: 13 }}>
          All
        </Link>
      </div>

      <Section title={showAll ? "All enquiries" : "Open enquiries"} subtitle={`${rows.length} ${showAll ? "shown, newest first" : "waiting on ThriveSphere or the enquirer"}`}>
        {rows.length === 0 ? (
          <Empty>{showAll ? "No enquiries yet." : "Nothing open. New enquiries and callback requests appear here."}</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((e) => (
              <Link
                key={e.id}
                href={`/admin/enquiries/${e.id}`}
                style={{ display: "block", border: "1px solid rgba(31,58,95,0.1)", borderRadius: 12, padding: "13px 17px", textDecoration: "none", color: "inherit" }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 13.5, letterSpacing: "0.03em", color: "var(--navy)" }}>{e.reference}</strong>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{e.name}</span>
                  <span style={{ fontSize: 12.5, color: "var(--navy-soft)" }}>{categoryLabel(e.category)}</span>
                  {e.clientId && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--teal-deep)" }}>existing client</span>}
                  <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 800, color: STATUS_COLOUR[e.status] ?? "var(--navy-soft)" }}>
                    {statusLabel(e.status)}
                  </span>
                </div>
                <div style={{ marginTop: 4, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: "var(--navy-soft)" }}>
                  <span>Received {dt(e.createdAt)}</span>
                  <span>{e.assigneeName || e.assigneeEmail ? `With ${e.assigneeName || e.assigneeEmail}` : "Not assigned"}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
