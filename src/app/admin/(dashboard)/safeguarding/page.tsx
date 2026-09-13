import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, incidents, safeguardingConcerns } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { Section, Empty } from "@/components/admin/RecordUI";
import { RiskBadge } from "@/components/admin/RiskBadge";
import { categoryLabel } from "@/lib/safeguarding-rules";
import { IncidentForm } from "@/components/admin/IncidentForm";

export const metadata: Metadata = { title: "Safeguarding", robots: { index: false, follow: false } };

const dt = (v: Date) =>
  v.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Safeguarding register.
 *
 * The list a Designated Safeguarding Lead needs: every concern still open
 * across all clients, most recent first, with escalation state visible without
 * opening each record.
 */
export default async function SafeguardingPage() {
  await requireCapability("safeguarding:read", {
    entity: "safeguarding_concerns",
    action: "view",
    detail: "viewed the safeguarding register",
  });

  const db = getDb();
  const [open, recentIncidents] = await Promise.all([
    db
      .select({
        id: safeguardingConcerns.id,
        category: safeguardingConcerns.category,
        level: safeguardingConcerns.level,
        status: safeguardingConcerns.status,
        detail: safeguardingConcerns.detail,
        escalatedTo: safeguardingConcerns.escalatedTo,
        escalatedAt: safeguardingConcerns.escalatedAt,
        raisedAt: safeguardingConcerns.raisedAt,
        clientId: clients.id,
        clientName: clients.preferredName,
      })
      .from(safeguardingConcerns)
      .leftJoin(clients, eq(clients.id, safeguardingConcerns.clientId))
      .where(ne(safeguardingConcerns.status, "closed"))
      .orderBy(desc(safeguardingConcerns.raisedAt))
      .limit(100),
    db.select().from(incidents).orderBy(desc(incidents.reportedAt)).limit(25),
  ]);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 24px 72px" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 800, color: "var(--navy)" }}>Safeguarding</h1>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--navy-soft)" }}>
        Concerns are raised from a client&apos;s record. Everything here is logged.
      </p>

      <Section title="Open concerns" subtitle={`${open.length} not yet closed`}>
        {open.length === 0 ? (
          <Empty>No open concerns.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {open.map((c) => (
              <div key={c.id} style={{ border: "1px solid rgba(31,58,95,0.1)", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 7 }}>
                  <RiskBadge level={c.level} compact />
                  <strong style={{ fontSize: 13.5, color: "var(--navy)" }}>{categoryLabel(c.category)}</strong>
                  {c.clientId && (
                    <Link href={`/admin/clients/${c.clientId}`} style={{ fontSize: 13.5, fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none" }}>
                      {c.clientName}
                    </Link>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.escalatedAt ? "var(--teal-deep)" : "#a1421c" }}>
                    {c.escalatedAt ? `escalated to ${c.escalatedTo}` : "not yet escalated"}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--navy-soft)" }}>{dt(c.raisedAt)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--ink)" }}>{c.detail}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Incidents" subtitle="Including data breaches — the ICO clock runs from when it happened, not when it was logged">
        <IncidentForm />
        <div style={{ marginTop: 16 }}>
          {recentIncidents.length === 0 ? (
            <Empty>No incidents logged.</Empty>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
              {recentIncidents.map((i) => (
                <li key={i.id} style={{ fontSize: 14, color: "var(--ink)" }}>
                  <strong style={{ color: "var(--navy)" }}>{i.type.replace(/_/g, " ")}</strong> — {i.summary}{" "}
                  <span style={{ color: "var(--navy-soft)" }}>({dt(i.occurredAt)}, {i.status})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>
    </div>
  );
}
