"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, users } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { recordAudit } from "@/lib/audit";
import { ForbiddenError, UnauthenticatedError, type Role } from "@/lib/authz";
import { assignableRoles, canCancelInvitation, canManageStaff, roleLabel } from "@/lib/staff-rules";
import {
  blockUser,
  deleteUser,
  findInvitation,
  inviteStaff,
  listInvitations,
  revokeInvitation,
  unblockUser,
} from "@/lib/clerk-admin";
import type { StaffFormState } from "@/lib/staff-state";

function str(fd: FormData, name: string) {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function mapGuardError(err: unknown, forbidden = "Only a founder can manage staff accounts."): StaffFormState | null {
  if (err instanceof UnauthenticatedError) {
    return { status: "error", message: "Your session has expired. Please sign in again." };
  }
  if (err instanceof ForbiddenError) {
    return { status: "error", message: forbidden };
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

  // Someone already in the system needs a role change, not an invitation. A
  // removed colleague has no sign-in any more, so they can be invited back.
  const existing = await getDb()
    .select()
    .from(users)
    .where(and(eq(users.email, email), ne(users.status, "deleted")))
    .limit(1);
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
    redirectUrl: `${site}/admin/join`,
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

/**
 * Remove a colleague who has left.
 *
 * Their sign-in is deleted at the provider and their account here is marked
 * removed, which fails every permission check. The row itself stays: their
 * name remains on the sessions they ran, the notes they wrote and the activity
 * log. Refused while they still have sessions booked, so no client is left
 * with an appointment nobody will attend.
 */
export async function removeStaffMember(
  _prev: StaffFormState,
  formData: FormData
): Promise<StaffFormState> {
  const targetId = str(formData, "userId");

  let actor;
  try {
    actor = await requireCapability("staff:remove", {
      entity: "users",
      entityId: targetId,
      action: "delete",
      detail: "staff removal requested",
    });
  } catch (err) {
    const mapped = mapGuardError(err, "You do not have permission to remove staff.");
    if (mapped) return mapped;
    throw err;
  }

  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
  if (!target) return { status: "error", message: "That account no longer exists." };

  const decision = canManageStaff({
    actor: { userId: actor.userId, role: actor.role },
    target: { userId: target.id, role: target.role as Role, status: target.status },
    action: "remove",
    foundersRemaining: await countFounders(),
  });
  if (!decision.allowed) return { status: "error", message: decision.reason };

  const upcoming = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.practitionerId, target.id),
        eq(appointments.status, "scheduled"),
        gte(appointments.startsAt, new Date())
      )
    );
  if (upcoming.length > 0) {
    const n = upcoming.length;
    return {
      status: "error",
      message: `${target.displayName || target.email} has ${n} upcoming session${n === 1 ? "" : "s"}. Reassign ${n === 1 ? "it" : "them"} under Appointments first.`,
    };
  }

  const result = await deleteUser(target.authId);

  // Our own status is what our guards check, so it is set even if the provider
  // call failed: an account we consider removed must not keep passing them.
  await db.update(users).set({ status: "deleted", updatedAt: new Date() }).where(eq(users.id, targetId));

  await recordAudit({
    actorId: actor.userId,
    action: "delete",
    entity: "users",
    entityId: targetId,
    detail: `${target.email} removed from staff (${roleLabel(target.role as Role)})`,
  });

  revalidatePath("/admin/staff");
  revalidatePath("/admin/availability");

  if (!result.ok) {
    return {
      status: "error",
      message: `Removed from the back office, but their sign-in could not be deleted (${result.reason}). It no longer opens anything here.`,
    };
  }
  return { status: "ok", message: `${target.email} has been removed.` };
}

/** Cancel an invitation that has not been accepted, so its link stops working. */
export async function cancelStaffInvitation(
  _prev: StaffFormState,
  formData: FormData
): Promise<StaffFormState> {
  const invitationId = str(formData, "invitationId");

  let actor;
  try {
    actor = await requireCapability("staff:remove", {
      entity: "users",
      action: "delete",
      detail: "invitation cancellation requested",
    });
  } catch (err) {
    const mapped = mapGuardError(err, "You do not have permission to cancel invitations.");
    if (mapped) return mapped;
    throw err;
  }

  // Read from the provider rather than the form, so the role checked and the
  // email recorded are the invitation's own.
  const pending = await listInvitations();
  if (!pending.ok) return { status: "error", message: `Invitations could not be loaded: ${pending.reason}` };
  const invitation = pending.value.find((i) => i.id === invitationId);
  if (!invitation) return { status: "error", message: "That invitation has already been accepted or cancelled." };

  if (!canCancelInvitation({ userId: actor.userId, role: actor.role }, invitation.role)) {
    return { status: "error", message: "Only a founder can cancel an invitation for an administrator or founder." };
  }

  const result = await revokeInvitation(invitation.id);
  if (!result.ok) return { status: "error", message: `Invitation not cancelled: ${result.reason}` };

  await recordAudit({
    actorId: actor.userId,
    action: "delete",
    entity: "users",
    detail: `cancelled invitation for ${invitation.email} (${roleLabel(invitation.role as Role)})`,
  });

  revalidatePath("/admin/staff");
  return { status: "ok", message: `Invitation for ${invitation.email} cancelled.` };
}

export type InvitationLinkResult = { status: "ok"; url: string } | { status: "error"; message: string };

/**
 * The link from an invitation that has not been accepted, so it can be sent
 * to the person directly when the email has not reached them.
 *
 * Anyone holding the link can create that colleague's account, so the same
 * people who could cancel the invitation may copy it, and each copy is logged.
 * An admin cannot copy an administrator's or founder's invitation and use it
 * to give themselves that role.
 */
export async function copyInvitationLink(invitationId: string): Promise<InvitationLinkResult> {
  let actor;
  try {
    actor = await requireCapability("staff:remove", {
      entity: "users",
      action: "export",
      detail: "invitation link requested",
    });
  } catch (err) {
    const mapped = mapGuardError(err, "You do not have permission to share invitations.");
    if (mapped) return { status: "error", message: mapped.message };
    throw err;
  }

  const found = await findInvitation(String(invitationId));
  if (!found.ok) return { status: "error", message: `The invitation could not be loaded: ${found.reason}` };
  if (!found.value) return { status: "error", message: "That invitation has already been accepted, cancelled or has expired." };

  const { invitation, url } = found.value;
  if (!canCancelInvitation({ userId: actor.userId, role: actor.role }, invitation.role)) {
    return { status: "error", message: "Only a founder can share an invitation for an administrator or founder." };
  }
  if (!url) return { status: "error", message: "No link came back for this invitation. Use Resend email instead." };

  await recordAudit({
    actorId: actor.userId,
    action: "export",
    entity: "users",
    detail: `copied the invitation link for ${invitation.email} (${roleLabel(invitation.role)})`,
  });

  return { status: "ok", url };
}

/**
 * Email an invitation again.
 *
 * Clerk cannot resend one, so this sends a new invitation with the same role
 * and inviter, then cancels the old one. The new one goes first: if it fails,
 * the old link still works.
 */
export async function resendStaffInvitation(
  _prev: StaffFormState,
  formData: FormData
): Promise<StaffFormState> {
  const invitationId = str(formData, "invitationId");

  let actor;
  try {
    actor = await requireCapability("staff:remove", {
      entity: "users",
      action: "create",
      detail: "invitation re-send requested",
    });
  } catch (err) {
    const mapped = mapGuardError(err, "You do not have permission to send invitations.");
    if (mapped) return mapped;
    throw err;
  }

  const found = await findInvitation(invitationId);
  if (!found.ok) return { status: "error", message: `The invitation could not be loaded: ${found.reason}` };
  if (!found.value) return { status: "error", message: "That invitation has already been accepted, cancelled or has expired." };

  const { invitation } = found.value;
  if (!canCancelInvitation({ userId: actor.userId, role: actor.role }, invitation.role)) {
    return { status: "error", message: "Only a founder can resend an invitation for an administrator or founder." };
  }

  const existing = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, invitation.email), ne(users.status, "deleted")))
    .limit(1);
  if (existing.length > 0) {
    return { status: "error", message: "That email now has an account. Cancel this invitation and change their role instead." };
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thrivsphere.org";
  const sent = await inviteStaff({
    email: invitation.email,
    role: invitation.role,
    invitedBy: invitation.invitedBy ?? actor.userId,
    redirectUrl: `${site}/admin/join`,
    ignoreExisting: true,
  });
  if (!sent.ok) return { status: "error", message: `Invitation not sent again: ${sent.reason}` };

  const revoked = await revokeInvitation(invitation.id);

  await recordAudit({
    actorId: actor.userId,
    action: "create",
    entity: "users",
    detail: `sent the invitation to ${invitation.email} again (${roleLabel(invitation.role)})`,
  });

  revalidatePath("/admin/staff");
  if (!revoked.ok) {
    return {
      status: "ok",
      message: `New invitation sent to ${invitation.email}. The earlier link could not be cancelled (${revoked.reason}), so both work until one is used.`,
    };
  }
  return { status: "ok", message: `New invitation sent to ${invitation.email}. The link in the earlier email no longer works.` };
}

/**
 * Name a colleague as a blog reviewer, or stop. The founder only. A reviewer
 * may approve other people's blog posts, never their own; the founder always
 * may, so the flag isn't offered for founders.
 */
export async function setBlogReviewer(_prev: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const targetId = str(formData, "userId");
  const on = str(formData, "reviewer") === "true";

  let actor;
  try {
    actor = await requireCapability("staff:manage", {
      entity: "users",
      entityId: targetId,
      action: "update",
      detail: on ? "blog reviewer added" : "blog reviewer removed",
    });
  } catch (err) {
    const mapped = mapGuardError(err, "Only the founder can choose blog reviewers.");
    if (mapped) return mapped;
    throw err;
  }
  if (actor.role !== "founder") return { status: "error", message: "Only the founder can choose blog reviewers." };

  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
  if (!target || target.status === "deleted") return { status: "error", message: "That account no longer exists." };
  if (target.role === "client") return { status: "error", message: "Only staff can review blog posts." };
  if (target.role === "founder") return { status: "error", message: "The founder can always approve blog posts." };

  await db.update(users).set({ blogReviewer: on, updatedAt: new Date() }).where(eq(users.id, targetId));
  await recordAudit({
    actorId: actor.userId,
    action: "update",
    entity: "users",
    entityId: targetId,
    detail: `${target.email} ${on ? "can now approve" : "can no longer approve"} blog posts`,
  });

  revalidatePath("/admin/staff");
  return { status: "ok", message: on ? `${target.email} can now approve other people's blog posts.` : `${target.email} can no longer approve blog posts.` };
}

/**
 * Name the Deputy Safeguarding Lead, or stop. The founder only. The deputy may
 * stand down safeguarding flags; the founder, as Safeguarding Lead, always may.
 */
export async function setSafeguardingDeputy(_prev: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const targetId = str(formData, "userId");
  const on = str(formData, "deputy") === "true";

  let actor;
  try {
    actor = await requireCapability("staff:manage", {
      entity: "users",
      entityId: targetId,
      action: "update",
      detail: on ? "deputy safeguarding lead added" : "deputy safeguarding lead removed",
    });
  } catch (err) {
    const mapped = mapGuardError(err, "Only the founder can choose the Deputy Safeguarding Lead.");
    if (mapped) return mapped;
    throw err;
  }
  if (actor.role !== "founder") return { status: "error", message: "Only the founder can choose the Deputy Safeguarding Lead." };

  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
  if (!target || target.status === "deleted") return { status: "error", message: "That account no longer exists." };
  if (target.role === "client") return { status: "error", message: "Only staff can be the Deputy Safeguarding Lead." };
  if (target.role === "founder") return { status: "error", message: "The founder is the Safeguarding Lead." };

  await db.update(users).set({ safeguardingDeputy: on, updatedAt: new Date() }).where(eq(users.id, targetId));
  await recordAudit({
    actorId: actor.userId,
    action: "update",
    entity: "users",
    entityId: targetId,
    detail: `${target.email} ${on ? "is now" : "is no longer"} the Deputy Safeguarding Lead`,
  });

  revalidatePath("/admin/staff");
  return { status: "ok", message: on ? `${target.email} is now the Deputy Safeguarding Lead.` : `${target.email} is no longer the Deputy Safeguarding Lead.` };
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
      blogReviewer: users.blogReviewer,
      safeguardingDeputy: users.safeguardingDeputy,
      createdAt: users.createdAt,
      lastSeenAt: users.lastSeenAt,
    })
    .from(users)
    .where(and(ne(users.role, "client"), ne(users.status, "deleted")))
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
