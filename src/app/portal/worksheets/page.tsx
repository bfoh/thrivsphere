import type { Metadata } from "next";
import Link from "next/link";
import { requirePortalClient } from "@/lib/portal-guard";
import { listMyWorksheets } from "@/lib/queries/worksheets";
import { getTemplate } from "@/lib/forms/registry";
import { NotCrisisNotice } from "@/components/NotCrisisNotice";
import { Icon } from "@/components/icons";
import { fmtDate } from "@/components/forms/format";

export const metadata: Metadata = { title: "Your worksheets", robots: { index: false, follow: false } };

const CLIENT_STATUS: Record<string, string> = {
  assigned: "Ready when you are",
  in_progress: "Started — saved in your account",
  submitted: "Sent to your practitioner",
  reviewed: "Talked through",
};

export default async function PortalWorksheetsPage() {
  const state = await requirePortalClient();
  const rows = await listMyWorksheets(state.clientId);
  const open = rows.filter((r) => r.status === "assigned" || r.status === "in_progress");
  const done = rows.filter((r) => r.status === "submitted" || r.status === "reviewed");

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 72px" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: "clamp(24px,4.6vw,30px)", fontWeight: 800, color: "var(--navy)" }}>Your worksheets</h1>
      <p style={{ margin: "0 0 26px", fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
        Activities your practitioner has set for you to try between sessions. Take them at your own pace — your answers save
        as you go, and only reach your practitioner when you send them.
      </p>

      {rows.length === 0 ? (
        <div className="card" style={{ padding: 32 }}>
          <p style={{ margin: 0, fontSize: 15, color: "var(--ink)" }}>Nothing has been set for you yet.</p>
        </div>
      ) : (
        <>
          {open.length > 0 && <List title="To do" rows={open} />}
          {done.length > 0 && <List title="Sent" rows={done} />}
        </>
      )}

      <NotCrisisNotice style={{ marginTop: 30 }} />
    </div>
  );
}

function List({
  title,
  rows,
}: {
  title: string;
  rows: Awaited<ReturnType<typeof listMyWorksheets>>;
}) {
  return (
    <section style={{ marginBottom: 26 }}>
      <h2 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 800, color: "var(--navy)" }}>{title}</h2>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map((r) => {
          const t = getTemplate(r.templateKey, r.templateVersion);
          return (
            <li key={r.id}>
              <Link
                href={`/portal/worksheets/${r.id}`}
                className="card"
                style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "18px 20px", textDecoration: "none" }}
              >
                <span style={{ flex: "0 0 auto", marginTop: 2 }}>
                  <Icon name="book" size={22} stroke="var(--teal)" />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: "block", fontSize: 15.5, color: "var(--navy)" }}>{t?.title ?? "Worksheet"}</strong>
                  {r.note && (
                    <span style={{ display: "block", marginTop: 4, fontSize: 14, color: "var(--ink)", lineHeight: 1.5 }}>{r.note}</span>
                  )}
                  <span style={{ display: "block", marginTop: 6, fontSize: 13, color: "var(--navy-soft)" }}>
                    {CLIENT_STATUS[r.status] ?? r.status} · set {fmtDate(r.assignedAt)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
