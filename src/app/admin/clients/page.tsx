import type { Metadata } from "next";
import Link from "next/link";
import { listClients } from "@/lib/queries/clients";
import { RiskBadge } from "@/components/admin/RiskBadge";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Clients",
  robots: { index: false, follow: false },
};

const STATUS_TONE: Record<string, string> = {
  enquiry: "#8a6d12",
  registered: "#2f6d6d",
  active: "#2f6d6d",
  paused: "#856a12",
  discharged: "#54637a",
  declined: "#8c2a1c",
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  // The guard lives in listClients, so there is no way to render this page
  // without the access having been checked and logged.
  const rows = await listClients(q);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px 72px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, color: "var(--navy)" }}>
            Clients
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "var(--navy-soft)" }}>
            {rows.length} {rows.length === 1 ? "record" : "records"}
            {q ? ` matching “${q}”` : ""}. Opening a record is logged.
          </p>
        </div>

        <form method="get" style={{ display: "flex", gap: 8 }}>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name or email"
            aria-label="Search clients"
            style={{
              fontFamily: "inherit",
              fontSize: 14,
              padding: "10px 13px",
              borderRadius: 10,
              border: "1px solid rgba(31,58,95,0.18)",
              background: "#fff",
              minWidth: 240,
            }}
          />
          <button className="pill pill-teal" style={{ padding: "10px 18px", fontSize: 13.5 }}>
            Search
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 15, color: "var(--ink)" }}>
            {q ? "No clients match that search." : "No client records yet."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "rgba(31,58,95,0.04)" }}>
                  {["Name", "Email", "Status", "Risk", "Registered", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "12px 16px",
                        fontSize: 11.5,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--navy-soft)",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid rgba(31,58,95,0.07)" }}>
                    <td style={{ padding: "13px 16px", fontWeight: 700, color: "var(--navy)" }}>
                      {r.preferredName}
                    </td>
                    <td style={{ padding: "13px 16px", color: "var(--ink)" }}>{r.email}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ color: STATUS_TONE[r.status] ?? "var(--ink)", fontWeight: 700, fontSize: 13 }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      {r.highestRisk ? (
                        <RiskBadge level={r.highestRisk} compact />
                      ) : (
                        <span style={{ color: "var(--navy-soft)", fontSize: 13 }}>—</span>
                      )}
                      {r.openConcerns > 0 && (
                        <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: "#a1421c" }}>
                          {r.openConcerns} open
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "13px 16px", color: "var(--navy-soft)", whiteSpace: "nowrap" }}>
                      {new Date(r.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "right" }}>
                      <Link
                        href={`/admin/clients/${r.id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          color: "var(--teal-deep)",
                          fontWeight: 700,
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Open <Icon name="arrow" size={15} stroke="var(--teal-deep)" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
