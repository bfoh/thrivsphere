import type { Metadata } from "next";
import { requirePortalClient } from "@/lib/portal-guard";
import { and, desc, eq } from "drizzle-orm";
import { requireClientAccess } from "@/lib/guard";
import { getDb } from "@/db";
import { documents } from "@/db/schema";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Your documents", robots: { index: false, follow: false } };

export default async function PortalDocumentsPage() {
  const state = await requirePortalClient();

  await requireClientAccess(state.clientId, { entity: "documents", action: "view" });

  // Only what a practitioner deliberately shared — internal paperwork about
  // someone is not theirs to browse by default.
  const rows = await getDb()
    .select()
    .from(documents)
    .where(and(eq(documents.clientId, state.clientId), eq(documents.visibleToClient, true)))
    .orderBy(desc(documents.uploadedAt));

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 72px" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: "clamp(24px,4.6vw,30px)", fontWeight: 800, color: "var(--navy)" }}>
        Your documents
      </h1>
      <p style={{ margin: "0 0 26px", fontSize: 15, lineHeight: 1.6, color: "var(--ink)" }}>
        Anything your practitioner has shared with you.
      </p>

      {rows.length === 0 ? (
        <div className="card" style={{ padding: 32 }}>
          <p style={{ margin: 0, fontSize: 15, color: "var(--ink)" }}>Nothing shared with you yet.</p>
        </div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((doc) => (
            <li key={doc.id} className="card" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <strong style={{ fontSize: 15, color: "var(--navy)" }}>{doc.filename}</strong>
                <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--navy-soft)" }}>
                  {doc.category} · {new Date(doc.uploadedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <a
                href={`/api/documents/${doc.id}`}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, color: "var(--teal-deep)", textDecoration: "none" }}
              >
                Download <Icon name="arrow" size={15} stroke="var(--teal-deep)" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
