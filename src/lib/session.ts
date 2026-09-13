import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, users } from "@/db/schema";
import type { Actor, Role } from "./authz";

/**
 * Resolve the signed-in person into an `Actor`.
 *
 * Authentication is Clerk's job; authorisation is ours. Clerk tells us *who*
 * this is, and this function turns that into the role and client linkage the
 * policy in `authz.ts` reasons about.
 *
 * Roles deliberately live in our own `users` table rather than in Clerk
 * metadata: a privilege level that can be changed from a third-party dashboard
 * without leaving a trace in our audit log is not something we want governing
 * access to confidential records.
 */
export async function getCurrentActor(): Promise<Actor | null> {
  const { userId: authId } = await auth();
  if (!authId) return null;

  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.authId, authId)).limit(1);

  const user = row ?? (await provisionUser(authId));
  if (!user) return null;

  // A client's own record id, so the policy can allow "their own" access.
  let clientId: string | null = null;
  if (user.role === "client") {
    const [c] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.userId, user.id))
      .limit(1);
    clientId = c?.id ?? null;
  }

  return {
    userId: user.id,
    role: user.role as Role,
    status: user.status as Actor["status"],
    clientId,
  };
}

/**
 * Create the local user row the first time someone signs in.
 *
 * Always `client`. Staff access is never granted automatically — a founder
 * grants it deliberately from /admin/staff, which writes an audit row, so
 * there is no path where signing up gets you near a client record.
 *
 * Invited colleagues do not arrive this way: the Clerk webhook creates their
 * row with the role the invitation carried, before they reach a page.
 */
async function provisionUser(authId: string) {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

  const [created] = await getDb()
    .insert(users)
    .values({ authId, email, displayName, role: "client", status: "active" })
    .onConflictDoUpdate({
      target: users.authId,
      set: { email, lastSeenAt: new Date() },
    })
    .returning();

  return created ?? null;
}
