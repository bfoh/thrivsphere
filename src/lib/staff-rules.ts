import { PRIVILEGED_ROLES, type Role } from "./authz";

/**
 * Rules governing who may change whose access.
 *
 * Pure and tested, because these are the highest-consequence checks in the
 * system. Getting authorisation to a client record wrong exposes one person's
 * data; getting *this* wrong hands someone the ability to reach every record,
 * or locks the organisation out of its own service permanently.
 *
 * Every rule here is a refusal. The permissive path is the short one.
 */

export type StaffAction = "change_role" | "block" | "unblock" | "invite";

export type ActingUser = { userId: string; role: Role };

export type TargetUser = {
  userId: string;
  role: Role;
  status: "active" | "suspended" | "deleted";
};

export type Decision = { allowed: true } | { allowed: false; reason: string };

const ALLOW: Decision = { allowed: true };
const deny = (reason: string): Decision => ({ allowed: false, reason });

/**
 * Whether `actor` may perform `action` on `target`.
 *
 * `foundersRemaining` counts active founders *including* the target, so the
 * caller does not have to work out whether removing this one empties the set.
 */
export function canManageStaff(params: {
  actor: ActingUser;
  target: TargetUser;
  action: StaffAction;
  /** New role, for `change_role`. */
  newRole?: Role;
  /** Active founders currently in the system, including the target. */
  foundersRemaining: number;
}): Decision {
  const { actor, target, action, newRole, foundersRemaining } = params;

  // Only a founder manages people at all. Admins run the service; they do not
  // decide who else gets access to it.
  if (actor.role !== "founder") {
    return deny("Only a founder can manage staff accounts.");
  }

  /*
   * Nobody edits their own access.
   *
   * The obvious attack is self-elevation, but the likelier accident is a
   * founder demoting or blocking themselves and losing the service. Both are
   * prevented by the same rule.
   */
  if (actor.userId === target.userId) {
    return deny("You cannot change your own role or access.");
  }

  // A client is not a back-office account; promote them deliberately elsewhere.
  if (action !== "invite" && action !== "change_role" && target.role === "client") {
    return deny("That is a client account, not a staff account.");
  }

  if (action === "change_role") {
    if (!newRole) return deny("No new role was given.");
    if (newRole === target.role) return deny("That is already their role.");

    // Granting admin or founder is the founder's own decision, and already is
    // — but stating it separately keeps the rule true if admins are ever given
    // limited staff management.
    if (PRIVILEGED_ROLES.includes(newRole) && actor.role !== "founder") {
      return deny("Only a founder can grant admin or founder access.");
    }

    // Removing the last founder leaves nobody who can appoint another.
    if (target.role === "founder" && newRole !== "founder" && foundersRemaining <= 1) {
      return deny(
        "This is the only founder. Appoint another founder before changing this one."
      );
    }
  }

  if (action === "block") {
    if (target.status === "suspended") return deny("That account is already blocked.");
    if (target.role === "founder" && foundersRemaining <= 1) {
      return deny("This is the only founder and cannot be blocked.");
    }
  }

  if (action === "unblock" && target.status !== "suspended") {
    return deny("That account is not blocked.");
  }

  return ALLOW;
}

/**
 * Roles an actor may hand out.
 *
 * Used to build the role picker, so the interface cannot offer something the
 * rules above would then refuse.
 */
export function assignableRoles(actor: ActingUser): Role[] {
  if (actor.role !== "founder") return [];
  return ["practitioner", "supervisor", "admin", "founder"];
}

/** Human label for a role, used in the interface and in audit entries. */
export function roleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    client: "Client",
    practitioner: "Practitioner",
    supervisor: "Supervisor",
    admin: "Administrator",
    founder: "Founder",
  };
  return labels[role] ?? role;
}
