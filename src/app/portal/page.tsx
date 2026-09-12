import type { Metadata } from "next";
import Link from "next/link";
import { requirePortalClient } from "@/lib/portal-guard";
import { desc, eq } from "drizzle-orm";
import { requireClientAccess } from "@/lib/guard";
import { getDb } from "@/db";
import { appointments, clients, packages } from "@/db/schema";
import { Icon } from "@/components/icons";
import { NotCrisisNotice } from "@/components/NotCrisisNotice";
import { ReminderToggle } from "@/components/portal/ReminderToggle";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

export default async function PortalPage() {
  const state = await requirePortalClient();

  // Guarded even though this is the client's own record: the read is audited
  // like any other access to confidential data.
  await requireClientAccess(state.clientId, { entity: "portal_dashboard", action: "view" });

  const db = getDb();
  const [upcoming, balances, me] = await Promise.all([
    db
      .select()
      .from(appointments)
      .where(eq(appointments.clientId, state.clientId))
      .orderBy(desc(appointments.startsAt))
      .limit(5),
    db.select().from(packages).where(eq(packages.clientId, state.clientId)),
    db
      .select({ emailRemindersEnabled: clients.emailRemindersEnabled })
      .from(clients)
      .where(eq(clients.id, state.clientId))
      .limit(1),
  ]);

  const remaining = balances
    .filter((p) => p.status === "active")
    .reduce((n, p) => n + (p.sessionsTotal - p.sessionsUsed), 0);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 72px" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: "clamp(24px,4.6vw,30px)", fontWeight: 800, color: "var(--navy)" }}>
        Welcome back{state.preferredName ? `, ${state.preferredName}` : ""}
      </h1>
      <p style={{ margin: "0 0 28px", fontSize: 15, color: "var(--navy-soft)" }}>
        Your sessions and messages live here. We never send personal details by email.
      </p>

      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 17, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="heart" size={19} stroke="var(--teal)" /> Sessions remaining
          </h2>
          <div style={{ fontSize: 34, fontWeight: 800, color: "var(--teal-deep)" }}>{remaining}</div>
          <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "var(--navy-soft)", lineHeight: 1.5 }}>
            {remaining > 0
              ? "Book whenever you're ready."
              : "Once you book your first consultation it will show here."}
          </p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 17, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="compass" size={19} stroke="var(--teal)" /> Your appointments
          </h2>
          {upcoming.length === 0 ? (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--ink)" }}>
              You don&apos;t have any appointments yet.{" "}
              <Link href="/contact" style={{ color: "var(--teal-deep)", fontWeight: 700 }}>
                Get in touch
              </Link>{" "}
              and we&apos;ll arrange your first session.
            </p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {upcoming.map((a) => (
                <li key={a.id} style={{ fontSize: 14, color: "var(--ink)" }}>
                  <strong style={{ color: "var(--navy)" }}>
                    {new Date(a.startsAt).toLocaleString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>{" "}
                  — {a.status.replace(/_/g, " ")}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <ReminderToggle enabled={me[0]?.emailRemindersEnabled ?? true} />
      </div>

      <NotCrisisNotice style={{ marginTop: 26 }} />
    </div>
  );
}
