import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, gte, inArray, ne, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLog, clients, users } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { Section, Empty } from "@/components/admin/RecordUI";
import {
  ACTIONS,
  PAGE_SIZE,
  RANGES,
  actionLabel,
  parseActivityFilters,
  withFilter,
} from "@/lib/activity-filters";
import { roleLabel } from "@/lib/staff-rules";
import type { Role } from "@/lib/authz";

export const metadata: Metadata = { title: "Activity", robots: { index: false, follow: false } };

const dt = (v: Date) =>
  v.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

/**
 * Access log.
 *
 * Two properties matter more than anything on the page:
 *
 *  - **Read-only.** No delete, no edit, no clear. A log that can be tidied is
 *    not evidence, and the only reason to tidy one is the reason you would
 *    most want it kept.
 *  - **It records that a record was opened, never what was in it.** The `detail`
 *    column carries a short note written by the guard — "viewed the
 *    safeguarding register" — deliberately not the contents. Otherwise the log
 *    quietly becomes a second copy of the client record, held under weaker
 *    protection than the record itself.
 *
 * The client column links to the record so a founder can follow a question, but
 * following it is itself an access and is logged in turn.
 */
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCapability("audit:read", {
    entity: "audit_log",
    action: "view",
    detail: "viewed the activity log",
  });

  const filters = parseActivityFilters(await searchParams);
  const db = getDb();

  const conditions: SQL[] = [gte(auditLog.createdAt, filters.since)];
  if (filters.action) conditions.push(eq(auditLog.action, filters.action));
  if (filters.actorId) conditions.push(eq(auditLog.actorId, filters.actorId));
  if (filters.clientId) conditions.push(eq(auditLog.subjectClientId, filters.clientId));

  const [entries, staff] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entity: auditLog.entity,
        detail: auditLog.detail,
        ipAddress: auditLog.ipAddress,
        createdAt: auditLog.createdAt,
        subjectClientId: auditLog.subjectClientId,
        actorEmail: users.email,
        actorName: users.displayName,
        actorRole: users.role,
      })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.actorId))
      .where(and(...conditions))
      .orderBy(desc(auditLog.createdAt))
      // One extra row, purely to know whether a "next" link is worth showing.
      .limit(PAGE_SIZE + 1)
      .offset((filters.page - 1) * PAGE_SIZE),
    db
      .select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users)
      .where(ne(users.role, "client"))
      .orderBy(users.email),
  ]);

  const hasNext = entries.length > PAGE_SIZE;
  const rows = hasNext ? entries.slice(0, PAGE_SIZE) : entries;

  // Names for the clients referenced on this page only — not a client list.
  const clientIds = [...new Set(rows.map((r) => r.subjectClientId).filter(Boolean))] as string[];
  const clientNames = new Map<string, string>();
  if (clientIds.length > 0) {
    const named = await db
      .select({ id: clients.id, name: clients.preferredName })
      .from(clients)
      .where(inArray(clients.id, clientIds));
    for (const c of named) clientNames.set(c.id, c.name);
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px 72px" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 800, color: "var(--navy)" }}>Activity</h1>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--navy-soft)", maxWidth: 620, lineHeight: 1.6 }}>
        Who did what, and when. Entries cannot be edited or removed by anyone, including a founder.
        The log records that a record was opened — never what it contained.
      </p>

      <Section title="Filter" subtitle={`Showing the last ${filters.days} days`}>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
          <FilterGroup label="Period">
            {RANGES.map((d) => (
              <Chip
                key={d}
                href={`/admin/activity${withFilter(filters, { days: String(d) })}`}
                active={filters.days === d}
              >
                {d === 365 ? "1 year" : `${d} days`}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup label="Action">
            <Chip href={`/admin/activity${withFilter(filters, { action: null })}`} active={!filters.action}>
              All
            </Chip>
            {ACTIONS.map((a) => (
              <Chip
                key={a}
                href={`/admin/activity${withFilter(filters, { action: a })}`}
                active={filters.action === a}
              >
                {actionLabel(a)}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup label="Person">
            <Chip href={`/admin/activity${withFilter(filters, { actor: null })}`} active={!filters.actorId}>
              Everyone
            </Chip>
            {staff.map((s) => (
              <Chip
                key={s.id}
                href={`/admin/activity${withFilter(filters, { actor: s.id })}`}
                active={filters.actorId === s.id}
              >
                {s.displayName || s.email}
              </Chip>
            ))}
          </FilterGroup>
        </div>

        {filters.clientId && (
          <p style={{ margin: "16px 0 0", fontSize: 13.5, color: "var(--navy)" }}>
            Filtered to one client.{" "}
            <Link href={`/admin/activity${withFilter(filters, { client: null })}`} style={linkStyle}>
              Show all clients
            </Link>
          </p>
        )}
      </Section>

      <Section title="Entries" subtitle={rows.length === 0 ? "Nothing in this period" : undefined}>
        {rows.length === 0 ? (
          <Empty>No activity matches these filters.</Empty>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 820 }}>
              <thead>
                <tr>
                  {["When", "Who", "Action", "Record", "Client", "From"].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ ...td, whiteSpace: "nowrap", color: "var(--navy-soft)" }}>{dt(r.createdAt)}</td>
                    <td style={td}>
                      {r.actorEmail ? (
                        <>
                          <strong style={{ color: "var(--navy)" }}>{r.actorName || r.actorEmail}</strong>
                          <div style={{ fontSize: 11.5, color: "var(--navy-soft)" }}>
                            {roleLabel(r.actorRole as Role)}
                          </div>
                        </>
                      ) : (
                        <em style={{ color: "var(--navy-soft)" }}>not signed in</em>
                      )}
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: r.action === "permission_denied" ? "#b4553f" : "var(--navy)" }}>
                      {actionLabel(r.action)}
                    </td>
                    <td style={td}>
                      <span style={{ color: "var(--navy)" }}>{r.entity.replace(/_/g, " ")}</span>
                      {r.detail && (
                        <div style={{ fontSize: 12.5, color: "var(--navy-soft)", lineHeight: 1.5 }}>{r.detail}</div>
                      )}
                    </td>
                    <td style={td}>
                      {r.subjectClientId ? (
                        <Link href={`/admin/clients/${r.subjectClientId}`} style={linkStyle}>
                          {clientNames.get(r.subjectClientId) ?? "client"}
                        </Link>
                      ) : (
                        <span style={{ color: "var(--navy-soft)" }}>—</span>
                      )}
                    </td>
                    <td style={{ ...td, fontSize: 12, color: "var(--navy-soft)", whiteSpace: "nowrap" }}>
                      {r.ipAddress ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(filters.page > 1 || hasNext) && (
          <div style={{ display: "flex", gap: 12, marginTop: 18, alignItems: "center" }}>
            {filters.page > 1 && (
              <Link href={`/admin/activity${withFilter(filters, { page: String(filters.page - 1) })}`} style={linkStyle}>
                ← Newer
              </Link>
            )}
            <span style={{ fontSize: 13, color: "var(--navy-soft)" }}>Page {filters.page}</span>
            {hasNext && (
              <Link href={`/admin/activity${withFilter(filters, { page: String(filters.page + 1) })}`} style={linkStyle}>
                Older →
              </Link>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--navy-soft)", letterSpacing: "0.05em", marginBottom: 7 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        fontSize: 12.5,
        fontWeight: 700,
        padding: "6px 13px",
        borderRadius: 999,
        textDecoration: "none",
        border: "1px solid",
        borderColor: active ? "var(--teal-deep)" : "rgba(31,58,95,0.16)",
        background: active ? "var(--teal-deep)" : "#fff",
        color: active ? "#fff" : "var(--navy)",
      }}
    >
      {children}
    </Link>
  );
}

const linkStyle: React.CSSProperties = {
  fontSize: 13.5, fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none",
};
const th: React.CSSProperties = {
  textAlign: "left", padding: "8px 12px 10px", fontSize: 11.5, fontWeight: 800,
  color: "var(--navy-soft)", borderBottom: "1px solid rgba(31,58,95,0.12)", whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "11px 12px", borderBottom: "1px solid rgba(31,58,95,0.07)", verticalAlign: "top",
};
