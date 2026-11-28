import type { Metadata } from "next";
import Link from "next/link";
import { listClients } from "@/lib/queries/clients";
import { FlagBadge } from "@/components/admin/FlagBadge";
import { Icon } from "@/components/icons";
import { Badge, CLIENT_STATUS_TONE, Page, PageHeader, TableWrap, statusText } from "@/components/admin/ui";

export const metadata: Metadata = {
  title: "Clients",
  robots: { index: false, follow: false },
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
    <Page>
      <PageHeader
        title="Clients"
        description={
          <>
            {rows.length} {rows.length === 1 ? "record" : "records"}
            {q ? ` matching “${q}”` : ""}. Opening a record is logged.
          </>
        }
        actions={
          <form method="get" role="search" style={{ display: "flex", gap: 8 }}>
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search name or email"
              aria-label="Search clients"
              style={{ minWidth: 240 }}
            />
            <button className="pill pill-teal" style={{ padding: "0 18px", fontSize: 14 }}>
              Search
            </button>
          </form>
        }
      />

      {rows.length === 0 ? (
        <p className="adm-empty">{q ? "No clients match that search." : "No client records yet."}</p>
      ) : (
        <TableWrap>
          <table className="adm-table" data-stack>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Status</th>
                <th scope="col">Safeguarding</th>
                <th scope="col">Registered</th>
                <th scope="col">
                  <span className="visually-hidden">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, color: "var(--navy)" }}>{r.preferredName}</td>
                  <td data-label="Email">{r.email}</td>
                  <td data-label="Status">
                    <Badge tone={CLIENT_STATUS_TONE[r.status] ?? "neutral"}>{statusText(r.status)}</Badge>
                  </td>
                  <td data-label="Safeguarding">
                    {r.flagged ? <FlagBadge compact /> : <span style={{ color: "var(--navy-soft)" }}>—</span>}
                    {r.openConcerns > 0 && (
                      <span style={{ marginLeft: 8, fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--a-danger)" }}>
                        {r.openConcerns} open
                      </span>
                    )}
                  </td>
                  <td data-label="Registered" style={{ color: "var(--navy-soft)", whiteSpace: "nowrap" }}>
                    {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      href={`/admin/clients/${r.id}`}
                      aria-label={`Open ${r.preferredName}'s record`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--teal-deep)", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}
                    >
                      Open <Icon name="arrow" size={15} stroke="currentColor" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </Page>
  );
}
