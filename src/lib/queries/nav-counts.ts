import { count, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { enquiries, safeguardingConcerns, worksheetAssignments } from "@/db/schema";
import { can, type Actor } from "@/lib/authz";

export type NavCount = { count: number; tone?: "danger" };

/**
 * Waiting work shown beside the sidebar's entries, keyed by href.
 *
 * Totals only, and only for queues the person can open, so the menu never
 * hints at a queue they have no access to. The same totals as the dashboard.
 */
export async function navCounts(actor: Actor): Promise<Record<string, NavCount>> {
  const db = getDb();
  const zero = Promise.resolve([{ n: 0 }]);
  const [[newEnquiries], [openConcerns], [toReview]] = await Promise.all([
    can(actor, "enquiry:manage")
      ? db.select({ n: count() }).from(enquiries).where(eq(enquiries.status, "new"))
      : zero,
    can(actor, "safeguarding:read")
      ? db.select({ n: count() }).from(safeguardingConcerns).where(ne(safeguardingConcerns.status, "closed"))
      : zero,
    can(actor, "worksheet:manage")
      ? db.select({ n: count() }).from(worksheetAssignments).where(eq(worksheetAssignments.status, "submitted"))
      : zero,
  ]);
  return {
    "/admin/enquiries": { count: newEnquiries.n },
    "/admin/safeguarding": { count: openConcerns.n, tone: "danger" },
    "/admin/resources": { count: toReview.n },
  };
}
