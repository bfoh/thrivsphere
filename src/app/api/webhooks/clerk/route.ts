import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifySvixSignature } from "@/lib/svix-signature";
import { interpretClerkEvent } from "@/lib/clerk-events";
import { recordAudit } from "@/lib/audit";

/**
 * Clerk account and session webhook.
 *
 * Two jobs:
 *
 *  1. **Session bookends in the access log.** Everything a staff member opens
 *     is already logged by `guard.ts`; what was missing was when they signed in
 *     and out. Without those, the log shows activity with no beginning and no
 *     end, which is exactly the shape an investigation needs.
 *  2. **Applying an invited role at account creation.** The role a founder
 *     chose travels in the invitation's metadata, so a new colleague is created
 *     with the permissions somebody chose rather than being corrected a moment
 *     afterwards.
 *
 * Unauthenticated by necessity — Clerk has no session with us — so the
 * signature check is the whole of the defence and fails closed.
 */
export async function POST(request: Request) {
  const payload = await request.text();

  const verified = verifySvixSignature({
    payload,
    headers: {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    },
    secret: process.env.CLERK_WEBHOOK_SECRET,
  });

  if (!verified.ok) {
    console.error("[clerk] rejected webhook:", verified.reason);
    await recordAudit({
      actorId: null,
      action: "permission_denied",
      entity: "users",
      detail: `rejected Clerk webhook: ${verified.reason}`,
    });
    return new Response("Invalid signature", { status: 400 });
  }

  let event: unknown;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  const action = interpretClerkEvent(event);
  const db = getDb();

  // Acknowledged, not retried: Clerk sends more events than we subscribe to,
  // and a non-2xx would have it redeliver something we will never act on.
  if (action.kind === "ignored") return new Response("Ignored", { status: 200 });

  if (action.kind === "user_created") {
    /*
     * Someone may already have a row here: signing in provisions one lazily,
     * and the webhook can arrive after that has happened. The role is only
     * applied when an invitation actually named one — otherwise a self-serve
     * sign-up would overwrite a role a founder had already set.
     */
    const invited = action.role !== "client";

    await db
      .insert(users)
      .values({
        authId: action.authId,
        email: action.email,
        displayName: action.displayName,
        role: action.role,
        status: "active",
      })
      .onConflictDoUpdate({
        target: users.authId,
        set: invited
          ? { role: action.role, email: action.email, updatedAt: new Date() }
          : { email: action.email, updatedAt: new Date() },
      });

    const [row] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.authId, action.authId))
      .limit(1);

    await recordAudit({
      actorId: row?.id ?? null,
      action: "create",
      entity: "users",
      entityId: row?.id ?? null,
      detail: `account created for ${action.email}${invited ? ` as ${action.role}` : ""}`,
    });

    return new Response("Created", { status: 200 });
  }

  // Everything below concerns an account we should already know about.
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.authId, action.authId))
    .limit(1);

  if (!user) {
    // Not an error: the sign-in that provisions the row may not have completed
    // yet. Retrying would not help, so acknowledge and move on.
    console.warn("[clerk] event for an unknown account", action.kind, action.authId);
    return new Response("Unknown account", { status: 200 });
  }

  if (action.kind === "user_updated") {
    /*
     * Only what the person actually changed about themselves. Their role and
     * status are ours, not Clerk's, and are left alone — a blocked colleague
     * editing their own name must not quietly come back as active.
     */
    const changed = user.email !== action.email;
    await db
      .update(users)
      .set({ email: action.email, displayName: action.displayName, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    if (changed) {
      await recordAudit({
        actorId: user.id,
        action: "update",
        entity: "users",
        entityId: user.id,
        detail: `email changed from ${user.email} to ${action.email}`,
      });
    }

    return new Response("Updated", { status: 200 });
  }

  if (action.kind === "login") {
    await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));
    await recordAudit({
      actorId: user.id,
      action: "login",
      entity: "users",
      entityId: user.id,
      detail: action.sessionId ? `signed in (session ${action.sessionId})` : "signed in",
    });
    return new Response("Recorded", { status: 200 });
  }

  if (action.kind === "logout") {
    await recordAudit({
      actorId: user.id,
      action: "logout",
      entity: "users",
      entityId: user.id,
      detail: action.sessionId ? `session ended (${action.sessionId})` : "session ended",
    });
    return new Response("Recorded", { status: 200 });
  }

  /*
   * Deleted at the provider.
   *
   * The row is marked rather than removed. Audit entries reference it, and an
   * access log that loses the identity of whoever did something stops being
   * evidence. `deleted` fails every capability check, so nothing is reachable
   * through it.
   */
  await db
    .update(users)
    .set({ status: "deleted", updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await recordAudit({
    actorId: user.id,
    action: "delete",
    entity: "users",
    entityId: user.id,
    detail: `account removed at the provider (${user.email})`,
  });

  return new Response("Recorded", { status: 200 });
}
