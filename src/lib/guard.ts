import "server-only";

import { recordAudit, type AuditAction } from "./audit";
import { getCurrentActor } from "./session";
import {
  ForbiddenError,
  UnauthenticatedError,
  can,
  canAccessClient,
  type Actor,
  type Capability,
} from "./authz";

/**
 * The single door to confidential data.
 *
 * Every read or write of a client record goes through `requireCapability` or
 * `requireClientAccess`. Both do the same three things in the same order:
 * establish who is asking, decide whether they may, and write an audit row
 * either way. Denials are logged as deliberately as successes — an access log
 * that only records what succeeded cannot show that a probe was repelled.
 *
 * Call sites should not check roles themselves. If a new rule is needed, it
 * belongs in `authz.ts` so it stays in one reviewable place.
 */

type GuardOptions = {
  /** Table the request concerns, e.g. "session_notes". */
  entity: string;
  entityId?: string | null;
  /** Whose confidential data this is, when it concerns one client. */
  subjectClientId?: string | null;
  /** Defaults to a sensible action for the capability. */
  action?: AuditAction;
  detail?: string | null;
};

/** Require a capability. Returns the actor so the caller need not fetch it twice. */
export async function requireCapability(
  capability: Capability,
  options: GuardOptions
): Promise<Actor> {
  const actor = await getCurrentActor();

  if (!actor) {
    await recordAudit({
      actorId: null,
      action: "permission_denied",
      entity: options.entity,
      entityId: options.entityId,
      subjectClientId: options.subjectClientId,
      detail: `unauthenticated attempt: ${capability}`,
    });
    throw new UnauthenticatedError();
  }

  if (!can(actor, capability)) {
    await recordAudit({
      actorId: actor.userId,
      action: "permission_denied",
      entity: options.entity,
      entityId: options.entityId,
      subjectClientId: options.subjectClientId,
      detail: `lacks ${capability} (role: ${actor.role})`,
    });
    throw new ForbiddenError();
  }

  await recordAudit({
    actorId: actor.userId,
    action: options.action ?? defaultAction(capability),
    entity: options.entity,
    entityId: options.entityId,
    subjectClientId: options.subjectClientId,
    detail: options.detail ?? capability,
  });

  return actor;
}

/**
 * Require access to one specific client's record.
 *
 * This is the check that stops a signed-in client reading someone else's
 * record by changing an id in the URL, so it is enforced separately from the
 * capability check rather than folded into it.
 */
export async function requireClientAccess(
  clientId: string,
  options: Omit<GuardOptions, "subjectClientId">
): Promise<Actor> {
  const actor = await getCurrentActor();

  if (!actor) {
    await recordAudit({
      actorId: null,
      action: "permission_denied",
      entity: options.entity,
      entityId: options.entityId,
      subjectClientId: clientId,
      detail: "unauthenticated attempt to access client record",
    });
    throw new UnauthenticatedError();
  }

  if (!canAccessClient(actor, clientId)) {
    await recordAudit({
      actorId: actor.userId,
      action: "permission_denied",
      entity: options.entity,
      entityId: options.entityId,
      subjectClientId: clientId,
      detail: `role ${actor.role} may not access this client record`,
    });
    throw new ForbiddenError();
  }

  await recordAudit({
    actorId: actor.userId,
    action: options.action ?? "view",
    entity: options.entity,
    entityId: options.entityId,
    subjectClientId: clientId,
    detail: options.detail ?? null,
  });

  return actor;
}

/**
 * Require a capability on one client's record, as one audited access.
 *
 * For work that needs both — writing a supervision sheet needs
 * `supervision:write` and access to that client — without writing two
 * success rows for one action. Each refusal is still logged with its reason.
 */
export async function requireCapabilityForClient(
  capability: Capability,
  clientId: string,
  options: Omit<GuardOptions, "subjectClientId">
): Promise<Actor> {
  const actor = await getCurrentActor();
  const base = { entity: options.entity, entityId: options.entityId, subjectClientId: clientId };

  if (!actor) {
    await recordAudit({ ...base, actorId: null, action: "permission_denied", detail: `unauthenticated attempt: ${capability}` });
    throw new UnauthenticatedError();
  }
  if (!can(actor, capability)) {
    await recordAudit({
      ...base,
      actorId: actor.userId,
      action: "permission_denied",
      detail: `lacks ${capability} (role: ${actor.role})`,
    });
    throw new ForbiddenError();
  }
  if (!canAccessClient(actor, clientId)) {
    await recordAudit({
      ...base,
      actorId: actor.userId,
      action: "permission_denied",
      detail: `role ${actor.role} may not access this client record`,
    });
    throw new ForbiddenError();
  }

  await recordAudit({
    ...base,
    actorId: actor.userId,
    action: options.action ?? defaultAction(capability),
    detail: options.detail ?? capability,
  });
  return actor;
}

function defaultAction(capability: Capability): AuditAction {
  if (capability.includes(":write") || capability.includes(":manage")) return "update";
  if (capability.includes(":escalate")) return "update";
  return "view";
}

export { ForbiddenError, UnauthenticatedError };
