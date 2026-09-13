import "server-only";

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
}): Promise<Result<{ id: string }>> {
  return call("/invitations", {
    method: "POST",
    body: {
      email_address: params.email,
      redirect_url: params.redirectUrl,
      public_metadata: { thrivsphereRole: params.role, invitedBy: params.invitedBy },
      notify: true,
      ignore_existing: false,
    },
  });
}

export function revokeInvitation(invitationId: string): Promise<Result> {
  return call(`/invitations/${invitationId}/revoke`, { method: "POST" });
}

/** An invitation sent but not yet accepted. */
export type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  createdAt: Date | null;
};

type ClerkInvitation = {
  id?: unknown;
  email_address?: unknown;
  created_at?: unknown;
  public_metadata?: { thrivsphereRole?: unknown } | null;
};

/**
 * Invitations still outstanding.
 *
 * Clerk has returned this endpoint both as a bare array and, with pagination
 * enabled, as `{ data: [...] }`. Both shapes are accepted rather than assuming
 * one — a staff list that throws because the provider changed its envelope is a
 * poor trade for a few lines.
 */
export async function listInvitations(): Promise<Result<PendingInvitation[]>> {
  const res = await call<unknown>("/invitations?status=pending&limit=50", { method: "GET" });
  if (!res.ok) return res;

  const raw = Array.isArray(res.value)
    ? res.value
    : Array.isArray((res.value as { data?: unknown })?.data)
      ? ((res.value as { data: unknown[] }).data)
      : [];

  const invitations = raw.map((item) => {
    const inv = (item ?? {}) as ClerkInvitation;
    const created = typeof inv.created_at === "number" ? new Date(inv.created_at) : null;
    return {
      id: String(inv.id ?? ""),
      email: String(inv.email_address ?? ""),
      role: String(inv.public_metadata?.thrivsphereRole ?? "practitioner"),
      createdAt: created && !Number.isNaN(created.getTime()) ? created : null,
    };
  });

  return { ok: true, value: invitations };
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
