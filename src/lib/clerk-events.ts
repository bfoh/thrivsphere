import type { Role } from "./authz";

/**
 * Reading Clerk webhook events.
 *
 * Kept pure and separate from the route so the interpretation can be tested
 * against real payload shapes without a database or a network. The route's job
 * is then only to verify the signature and apply what this returns.
 *
 * Two rules run through it:
 *
 *  - An unrecognised event is *ignored*, not an error. Clerk sends more event
 *    types than we subscribe to, and a 500 on an event we do not care about
 *    makes Clerk retry it forever.
 *  - A role that is not one we recognise becomes `client`. The role arrives in
 *    metadata that a founder set on an invitation, but treating anything
 *    unexpected as the least-privileged option means a typo cannot grant
 *    access to client records.
 */

const ROLES: Role[] = ["client", "practitioner", "supervisor", "admin", "founder"];

export type ClerkAction =
  | { kind: "login"; authId: string; sessionId: string | null }
  | { kind: "logout"; authId: string; sessionId: string | null }
  | { kind: "user_created"; authId: string; email: string; displayName: string | null; role: Role }
  | { kind: "user_deleted"; authId: string }
  | { kind: "ignored"; reason: string };

type Json = Record<string, unknown>;

const asObject = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});
const asString = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export function interpretClerkEvent(event: unknown): ClerkAction {
  const root = asObject(event);
  const type = asString(root.type);
  const data = asObject(root.data);

  if (!type) return { kind: "ignored", reason: "no event type" };

  switch (type) {
    case "session.created": {
      const authId = asString(data.user_id);
      if (!authId) return { kind: "ignored", reason: "session.created without a user" };
      return { kind: "login", authId, sessionId: asString(data.id) };
    }

    // Ended, removed and revoked are three ways a session stops. To an access
    // log they are the same fact: this person no longer has that session.
    case "session.ended":
    case "session.removed":
    case "session.revoked": {
      const authId = asString(data.user_id);
      if (!authId) return { kind: "ignored", reason: `${type} without a user` };
      return { kind: "logout", authId, sessionId: asString(data.id) };
    }

    case "user.created": {
      const authId = asString(data.id);
      if (!authId) return { kind: "ignored", reason: "user.created without an id" };
      return {
        kind: "user_created",
        authId,
        email: primaryEmail(data) ?? "",
        displayName: displayName(data),
        role: roleFrom(data),
      };
    }

    case "user.deleted": {
      const authId = asString(data.id);
      if (!authId) return { kind: "ignored", reason: "user.deleted without an id" };
      return { kind: "user_deleted", authId };
    }

    default:
      return { kind: "ignored", reason: type };
  }
}

/**
 * The address Clerk considers primary, falling back to the first on file.
 *
 * Clerk sends every address with a separate `primary_email_address_id`. Taking
 * the first in the array would pick the wrong one for anyone who has added a
 * second address and promoted it.
 */
function primaryEmail(data: Json): string | null {
  const list = Array.isArray(data.email_addresses) ? data.email_addresses : [];
  const primaryId = asString(data.primary_email_address_id);

  const entries = list.map(asObject);
  const primary = primaryId ? entries.find((e) => asString(e.id) === primaryId) : undefined;
  const chosen = primary ?? entries[0];

  const address = chosen ? asString(chosen.email_address) : null;
  return address ? address.toLowerCase() : null;
}

function displayName(data: Json): string | null {
  const parts = [asString(data.first_name), asString(data.last_name)].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return asString(data.username);
}

/** The role a founder attached to the invitation, if we recognise it. */
function roleFrom(data: Json): Role {
  const metadata = asObject(data.public_metadata);
  const claimed = asString(metadata.thrivsphereRole);
  return claimed && (ROLES as string[]).includes(claimed) ? (claimed as Role) : "client";
}
