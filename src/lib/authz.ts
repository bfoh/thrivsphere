/**
 * Authorisation policy.
 *
 * Pure functions with no database, no framework and no identity provider, so
 * the rules that decide who may see a client record can be read — and tested —
 * on their own. Everything here answers "is this allowed?"; nothing here
 * fetches or logs. `src/lib/guard.ts` does that part.
 */

export type Role = "client" | "practitioner" | "supervisor" | "admin";

/** Who is asking. Built by the session layer from the identity provider. */
export type Actor = {
  userId: string;
  role: Role;
  status: "active" | "suspended" | "deleted";
  /** Set when the actor is themselves a client. */
  clientId?: string | null;
};

/**
 * Capabilities, named for what someone is trying to do rather than for a
 * table. Adding a practitioner tier later means editing this map, not hunting
 * for role checks scattered through route handlers.
 */
export type Capability =
  | "client:read:own"
  | "client:read:any"
  | "client:write:any"
  | "intake:read"
  | "notes:read"
  | "notes:write"
  | "notes:amend"
  | "safeguarding:read"
  | "safeguarding:write"
  | "safeguarding:escalate"
  | "incident:write"
  | "referral:write"
  | "appointment:book:own"
  | "appointment:manage:any"
  | "availability:manage"
  | "payment:read:own"
  | "payment:read:any"
  | "document:read:own"
  | "document:write:any"
  | "enquiry:manage"
  | "catalogue:manage"
  | "report:read"
  | "audit:read";

const CLIENT_CAPS: Capability[] = [
  "client:read:own",
  "appointment:book:own",
  "payment:read:own",
  "document:read:own",
];

/**
 * A practitioner can do the clinical-record work but deliberately cannot edit
 * the price list, read the audit log, or amend someone else's notes.
 */
const PRACTITIONER_CAPS: Capability[] = [
  "client:read:any",
  "client:write:any",
  "intake:read",
  "notes:read",
  "notes:write",
  "safeguarding:read",
  "safeguarding:write",
  "safeguarding:escalate",
  "incident:write",
  "referral:write",
  "appointment:manage:any",
  "availability:manage",
  "document:write:any",
];

const SUPERVISOR_CAPS: Capability[] = [
  ...PRACTITIONER_CAPS,
  "notes:amend",
  "report:read",
];

const ADMIN_CAPS: Capability[] = [
  ...SUPERVISOR_CAPS,
  "payment:read:any",
  "enquiry:manage",
  "catalogue:manage",
  "audit:read",
];

const CAPABILITIES: Record<Role, Capability[]> = {
  client: CLIENT_CAPS,
  practitioner: PRACTITIONER_CAPS,
  supervisor: SUPERVISOR_CAPS,
  admin: ADMIN_CAPS,
};

/**
 * Whether an actor holds a capability.
 *
 * A suspended or deleted account holds nothing, whatever its role — checked
 * first so that revoking access is immediate rather than dependent on every
 * call site remembering to look at status.
 */
export function can(actor: Actor | null, capability: Capability): boolean {
  if (!actor) return false;
  if (actor.status !== "active") return false;
  return CAPABILITIES[actor.role].includes(capability);
}

/**
 * Whether an actor may reach a particular client's record.
 *
 * Staff need the general capability; a client only ever reaches their own.
 * This is the check that stops one client reading another's notes by guessing
 * an id, so it is deliberately separate from `can`.
 */
export function canAccessClient(actor: Actor | null, clientId: string): boolean {
  if (!actor) return false;
  if (actor.status !== "active") return false;
  if (actor.role === "client") return actor.clientId === clientId;
  return can(actor, "client:read:any");
}

export function isStaff(actor: Actor | null): boolean {
  return (
    !!actor &&
    actor.status === "active" &&
    (actor.role === "practitioner" || actor.role === "supervisor" || actor.role === "admin")
  );
}

/** Thrown by the guard; mapped to 403 at the route boundary. */
export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Thrown when there is no signed-in user at all; mapped to 401. */
export class UnauthenticatedError extends Error {
  constructor(message = "You need to be signed in.") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}
