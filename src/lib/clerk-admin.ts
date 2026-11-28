import "server-only";
import { parseInvitations, type PendingInvitation } from "./invitation";

/**
 * Clerk Backend API calls needed to manage staff.
 *
 * Kept behind a thin wrapper so the rest of the application talks about
 * inviting and blocking people rather than about HTTP verbs, and so a future
 * provider change touches one file.
 *
 * Every function returns a result rather than throwing: staff management runs
 * from a form, and a provider outage should produce a message the founder can
 * act on, not a stack trace.
 */
const API = "https://api.clerk.com/v1";

type Result<T = void> = { ok: true; value: T } | { ok: false; reason: string };

function key(): string | null {
  return process.env.CLERK_SECRET_KEY ?? null;
}

async function call<T>(
  path: string,
  init: { method: string; body?: unknown }
): Promise<Result<T>> {
  const secret = key();
  if (!secret) return { ok: false, reason: "authentication provider not configured" };

  try {
    const res = await fetch(`${API}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

    const text = await res.text();
    if (!res.ok) {
      // Clerk returns a structured error; surface its message where there is one.
      let message = `provider returned ${res.status}`;
      try {
        const parsed = JSON.parse(text);
        message = parsed?.errors?.[0]?.message ?? message;
      } catch {
        /* keep the status-code message */
      }
      console.error("[clerk-admin]", init.method, path, res.status, text.slice(0, 200));
      return { ok: false, reason: message };
    }

    return { ok: true, value: (text ? JSON.parse(text) : undefined) as T };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "request failed" };
  }
}

/**
 * Invite someone to join as staff.
 *
 * The intended role travels in the invitation's metadata rather than being
 * applied after they accept. The webhook reads it when the account is created,
 * so a new colleague never exists — even briefly — with permissions nobody
 * chose for them.
 */
export function inviteStaff(params: {
  email: string;
  role: string;
  invitedBy: string;
  redirectUrl: string;
  /** Send even though an invitation to this address is still open: used to send one again. */
  ignoreExisting?: boolean;
}): Promise<Result<{ id: string }>> {
  return call("/invitations", {
    method: "POST",
    body: {
      email_address: params.email,
      redirect_url: params.redirectUrl,
      public_metadata: { thrivsphereRole: params.role, invitedBy: params.invitedBy },
      notify: true,
      ignore_existing: params.ignoreExisting ?? false,
    },
  });
}

export function revokeInvitation(invitationId: string): Promise<Result> {
  return call(`/invitations/${invitationId}/revoke`, { method: "POST" });
}

export type { PendingInvitation };

async function pendingInvitations(): Promise<Result<{ invitation: PendingInvitation; url: string | null }[]>> {
  const res = await call<unknown>("/invitations?status=pending&limit=50", { method: "GET" });
  if (!res.ok) return res;
  return { ok: true, value: parseInvitations(res.value) };
}

/** Invitations still outstanding, without their links. */
export async function listInvitations(): Promise<Result<PendingInvitation[]>> {
  const res = await pendingInvitations();
  if (!res.ok) return res;
  return { ok: true, value: res.value.map((r) => r.invitation) };
}

/**
 * One pending invitation with its link, or null once it has been accepted,
 * cancelled or has expired.
 */
export async function findInvitation(
  invitationId: string
): Promise<Result<{ invitation: PendingInvitation; url: string | null } | null>> {
  const res = await pendingInvitations();
  if (!res.ok) return res;
  return { ok: true, value: res.value.find((r) => r.invitation.id === invitationId) ?? null };
}

/**
 * Lock an account out.
 *
 * `banned` prevents future sign-in; revoking sessions ends the ones already
 * open. Without the second step a departing colleague keeps working access
 * until their session happens to expire, which is not what "blocked" means to
 * the person clicking the button.
 */
export async function blockUser(authId: string): Promise<Result> {
  const banned = await call(`/users/${authId}/ban`, { method: "POST" });
  if (!banned.ok) return banned;

  const revoked = await call<unknown[]>(`/users/${authId}/sessions/revoke`, { method: "POST" });
  if (!revoked.ok) {
    // The ban succeeded, so they cannot sign in again; say so precisely rather
    // than reporting a failure that would invite a confusing retry.
    console.error("[clerk-admin] banned but could not revoke live sessions", authId);
    return { ok: false, reason: "Blocked, but an open session may persist until it expires." };
  }
  return { ok: true, value: undefined };
}

export function unblockUser(authId: string): Promise<Result> {
  return call(`/users/${authId}/unban`, { method: "POST" });
}

/**
 * Delete someone's sign-in for good: their account, sessions and password.
 *
 * Only the provider's copy goes. Our own row stays, marked removed, because
 * past sessions, notes and the activity log must keep saying who did what.
 */
export function deleteUser(authId: string): Promise<Result> {
  return call(`/users/${authId}`, { method: "DELETE" });
}
