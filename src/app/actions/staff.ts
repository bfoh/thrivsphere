"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { recordAudit } from "@/lib/audit";
import { ForbiddenError, UnauthenticatedError, type Role } from "@/lib/authz";
import { assignableRoles, canManageStaff, roleLabel } from "@/lib/staff-rules";
import { blockUser, inviteStaff, unblockUser } from "@/lib/clerk-admin";
import type { StaffFormState } from "@/lib/staff-state";

function str(fd: FormData, name: string) {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function mapGuardError(err: unknown): StaffFormState | null {
  if (err instanceof UnauthenticatedError) {
    return { status: "error", message: "Your session has expired. Please sign in again." };
  }
  if (err instanceof ForbiddenError) {
    return { status: "error", message: "Only a founder can manage staff accounts." };
  }
  return null;
}

/** Active founders, so the rules can tell whether removing one empties the set. */
async function countFounders(): Promise<number> {
  const rows = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "founder"), eq(users.status, "active")));
  return rows.length;
}

/**
 * Invite a colleague.
 *
 * The role is attached to the invitation, not applied afterwards, so the
 * account is created with the intended permissions rather than being corrected
 * a moment later.
 */
export async function inviteStaffMember(
  _prev: StaffFormState,
  formData: FormData
): Promise<StaffFormState> {
  const email = str(formData, "email").toLowerCase();
  const role = str(formData, "role") as Role;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  let actor;
  try {
    actor = await requireCapability("staff:manage", {
      entity: "users",
      action: "create",
      detail: `invited ${email} as ${roleLabel(role)}`,
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  if (!assignableRoles({ userId: actor.userId, role: actor.role }).includes(role)) {
    return { status: "error", message: "That is not a role you can assign." };
  }

  // Someone already in the system needs a role change, not an invitation.
  const existing = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return {
      status: "error",
      message: "That email already has an account. Change their role instead.",
    };
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thrivsphere.org";
  const result = await inviteStaff({
    email,
    role,
    invitedBy: actor.userId,
    redirectUrl: `${site}/admin/login`,
  });

  if (!result.ok) return { status: "error", message: `Invitation not sent: ${result.reason}` };

  revalidatePath("/admin/staff");
  return { status: "ok", message: `Invitation sent to ${email}.` };
}

/**
 * Change someone's role.
 *
 * Every change writes an audit row naming both the old and the new role. Until
 * now roles could only be changed by a CLI script running outside the
 * application, which left no trace at all — for the permission that opens every
 * client record, that was the wrong way round.
 */
export async function changeStaffRole(
  _prev: StaffFormState,
  formData: FormData
): Promise<StaffFormState> {
  const targetId = str(formData, "userId");
  const newRole = str(formData, "role") as Role;

  let actor;
  try {
    actor = await requireCapability("role:assign", {
      entity: "users",
      entityId: targetId,
      action: "update",
      detail: `role change requested to ${roleLabel(newRole)}`,
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
  if (!target) return { status: "error", message: "That account no longer exists." };

  const decision = canManageStaff({
    actor: { userId: actor.userId, role: actor.role },
    target: { userId: target.id, role: target.role as Role, status: target.status as "active" },
    action: "change_role",
    newRole,
    foundersRemaining: await countFounders(),
  });

  if (!decision.allowed) return { status: "error", message: decision.reason };

  await db
    .update(users)
    .set({ role: newRole, updatedAt: new Date() })
    .where(eq(users.id, targetId));

  await recordAudit({
    actorId: actor.userId,
    action: "update",
    entity: "users",
    entityId: targetId,
    detail: `${target.email}: ${roleLabel(target.role as Role)} -> ${roleLabel(newRole)}`,
  });

  revalidatePath("/admin/staff");
  return { status: "ok", message: `${target.email} is now ${roleLabel(newRole)}.` };
}

/** Block or unblock an account, ending live sessions rather than only future ones. */
export async function setStaffBlocked(
  _prev: StaffFormState,
  formData: FormData
): Promise<StaffFormState> {
  const targetId = str(formData, "userId");
  const blocking = str(formData, "blocked") === "true";

  let actor;
  try {
    actor = await requireCapability("staff:manage", {
      entity: "users",
      entityId: targetId,
      action: "update",
      detail: blocking ? "block requested" : "unblock requested",
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
  if (!target) return { status: "error", message: "That account no longer exists." };

  const decision = canManageStaff({
    actor: { userId: actor.userId, role: actor.role },
    target: { userId: target.id, role: target.role as Role, status: target.status as "active" },
    action: blocking ? "block" : "unblock",
    foundersRemaining: await countFounders(),
  });

  if (!decision.allowed) return { status: "error", message: decision.reason };

  const result = blocking ? await blockUser(target.authId) : await unblockUser(target.authId);

  // The local status is authoritative for our own guards, so it is set even if
  // the provider call was only partly successful — an account we consider
  // blocked must not keep passing our checks.
  await db
    .update(users)
    .set({ status: blocking ? "suspended" : "active", updatedAt: new Date() })
    .where(eq(users.id, targetId));

  await recordAudit({
    actorId: actor.userId,
    action: "update",
    entity: "users",
    entityId: targetId,
    detail: `${target.email} ${blocking ? "blocked" : "unblocked"}`,
  });

  revalidatePath("/admin/staff");

  if (!result.ok) return { status: "error", message: result.reason };
  return {
    status: "ok",
    message: `${target.email} has been ${blocking ? "blocked" : "unblocked"}.`,
  };
}

/** Back-office accounts, for the staff screen. */
export async function listStaff() {
  await requireCapability("staff:read", {
    entity: "users",
    action: "view",
    detail: "viewed staff accounts",
  });

  return getDb()
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      lastSeenAt: users.lastSeenAt,
    })
    .from(users)
    .where(ne(users.role, "client"))
    .orderBy(users.createdAt);
}

/** Clients, listed separately so promoting one is deliberate rather than accidental. */
export async function listClientAccounts() {
  await requireCapability("staff:read", { entity: "users", action: "view" });
  return getDb()
    .select({ id: users.id, email: users.email, role: users.role, status: users.status })
    .from(users)
    .where(inArray(users.role, ["client"]))
    .limit(200);
}
