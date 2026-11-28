/**
 * Clerk's staff invitation link.
 *
 * Accepting an invitation in the email opens our page with a one-time ticket
 * in the query string. Only Clerk's sign-up form can use it, so a page that
 * receives one passes these two parameters on and nothing else.
 */
import type { Role } from "./authz";
import { invitedRole } from "./clerk-events";

const KEYS = ["__clerk_ticket", "__clerk_status"] as const;

type Query = Record<string, string | string[] | undefined>;

/** The invitation's query string, or null when the page was not opened from one. */
export function invitationQuery(query: Query): string | null {
  const ticket = query.__clerk_ticket;
  if (typeof ticket !== "string" || !ticket) return null;
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const value = query[key];
    if (typeof value === "string" && value) params.set(key, value);
  }
  return params.toString();
}

/**
 * Whether a signed-in account was created moments ago: the person who has
 * just accepted the invitation, rather than someone else already signed in on
 * the same device.
 */
export function acceptedJustNow(accountCreatedAt: number, now: number = Date.now()): boolean {
  return now - accountCreatedAt < 15 * 60 * 1000;
}

/** Whether the invitation is for someone who still has to create their account. */
export function isNewAccountInvitation(query: Query): boolean {
  return invitationQuery(query) !== null && query.__clerk_status === "sign_up";
}

/** A staff invitation sent but not yet accepted. */
export type PendingInvitation = {
  id: string;
  email: string;
  /** The role the account will be created with, read the way the webhook reads it. */
  role: Role;
  /** Who sent it, so an invitation sent again records the same person. */
  invitedBy: string | null;
  createdAt: Date | null;
  /** When the link stops working. Clerk's default is 30 days after sending. */
  expiresAt: Date | null;
};

type RawInvitation = {
  id?: unknown;
  email_address?: unknown;
  url?: unknown;
  created_at?: unknown;
  expires_at?: unknown;
  public_metadata?: { invitedBy?: unknown } | null;
};

function toDate(value: unknown): Date | null {
  if (typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Pending invitations from Clerk's list response, each with its link.
 *
 * Clerk has returned this list both as a bare array and, with pagination on,
 * as `{ data: [...] }`, so both are read. The link signs someone up, so it is
 * kept apart from the rest: it is handed out one invitation at a time, on
 * request, and never printed in a page.
 */
export function parseInvitations(body: unknown): { invitation: PendingInvitation; url: string | null }[] {
  const raw = Array.isArray(body)
    ? body
    : Array.isArray((body as { data?: unknown })?.data)
      ? (body as { data: unknown[] }).data
      : [];

  return raw.map((item) => {
    const inv = (item ?? {}) as RawInvitation;
    const invitedBy = inv.public_metadata?.invitedBy;
    return {
      invitation: {
        id: String(inv.id ?? ""),
        email: String(inv.email_address ?? ""),
        role: invitedRole(inv.public_metadata),
        invitedBy: typeof invitedBy === "string" && invitedBy ? invitedBy : null,
        createdAt: toDate(inv.created_at),
        expiresAt: toDate(inv.expires_at),
      },
      url: typeof inv.url === "string" && inv.url.startsWith("https://") ? inv.url : null,
    };
  });
}

/**
 * Pending invitations in a steady order, keyed so a row survives being sent
 * again.
 *
 * Sending again replaces the invitation and its id. Keyed by id, the row would
 * be drawn afresh and lose its "sent" message; the email address stays put.
 */
export function invitationRows(list: PendingInvitation[]): { key: string; invitation: PendingInvitation }[] {
  const seen = new Map<string, number>();
  return [...list]
    .sort((a, b) => a.email.localeCompare(b.email) || (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0))
    .map((invitation) => {
      const n = seen.get(invitation.email) ?? 0;
      seen.set(invitation.email, n + 1);
      return { key: `${invitation.email}#${n}`, invitation };
    });
}
