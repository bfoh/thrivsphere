import "server-only";

import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";

const name = (u: { displayName: string | null; email: string }) => u.displayName || u.email;

/** Staff who can be named as the wellbeing practitioner on a record. */
export async function listPractitionerChoices() {
  const rows = await getDb()
    .select({ id: users.id, displayName: users.displayName, email: users.email })
    .from(users)
    .where(and(eq(users.status, "active"), ne(users.role, "client")))
    .orderBy(users.createdAt);
  return rows.map((r) => ({ id: r.id, name: name(r) }));
}

/** Names of the staff on a set of records (practitioner, completed by, closed by). */
export async function staffNames(ids: (string | null)[]): Promise<Record<string, string>> {
  const wanted = [...new Set(ids.filter((x): x is string => !!x))];
  if (wanted.length === 0) return {};
  const rows = await getDb()
    .select({ id: users.id, displayName: users.displayName, email: users.email })
    .from(users)
    .where(inArray(users.id, wanted));
  return Object.fromEntries(rows.map((r) => [r.id, name(r)]));
}

/** Whether this person may stand down safeguarding flags (founder or deputy). */
export async function isSafeguardingDeputy(userId: string): Promise<boolean> {
  const [row] = await getDb().select({ deputy: users.safeguardingDeputy }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.deputy ?? false;
}
