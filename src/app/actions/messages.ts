"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { secureMessages } from "@/db/schema";
import { getCurrentActor } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { canAccessClient, isStaff } from "@/lib/authz";
import type { MessageState } from "@/lib/message-state";

const MAX_LENGTH = 5000;

/**
 * Send a message inside the portal.
 *
 * This exists so that nothing personal ever has to travel by ordinary email,
 * which the brief rules out. Email is only ever used to say "you have a new
 * message" — the content stays behind authentication.
 */
export async function sendSecureMessage(
  _prev: MessageState,
  formData: FormData
): Promise<MessageState> {
  const clientId = String(formData.get("clientId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!clientId) return { status: "error", message: "Missing conversation." };
  if (!body) return { status: "error", message: "Write a message first." };
  if (body.length > MAX_LENGTH) {
    return { status: "error", message: `Messages must be under ${MAX_LENGTH} characters.` };
  }

  const actor = await getCurrentActor();
  if (!actor) return { status: "error", message: "Please sign in again." };

  // A client may only message on their own record; staff may message any.
  if (!canAccessClient(actor, clientId)) {
    await recordAudit({
      actorId: actor.userId,
      action: "permission_denied",
      entity: "secure_messages",
      subjectClientId: clientId,
      detail: "attempted to send a message on another client's record",
    });
    return { status: "error", message: "You do not have permission to do that." };
  }

  await getDb().insert(secureMessages).values({
    clientId,
    senderId: actor.userId,
    body,
  });

  await recordAudit({
    actorId: actor.userId,
    action: "create",
    entity: "secure_messages",
    subjectClientId: clientId,
    // The message body is deliberately not copied into the audit detail — the
    // access log records that a message was sent, not what it said.
    detail: "sent a secure message",
  });

  revalidatePath("/portal/messages");
  revalidatePath(`/admin/clients/${clientId}`);
  return { status: "ok", message: "Message sent." };
}

/** Mark the other party's messages in a conversation as read. */
export async function markMessagesRead(clientId: string): Promise<void> {
  const actor = await getCurrentActor();
  if (!actor || !canAccessClient(actor, clientId)) return;

  await getDb()
    .update(secureMessages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(secureMessages.clientId, clientId),
        ne(secureMessages.senderId, actor.userId),
        isNull(secureMessages.readAt)
      )
    );
}

export async function getConversation(clientId: string) {
  const actor = await getCurrentActor();
  if (!actor || !canAccessClient(actor, clientId)) return null;

  const db = getDb();
  const rows = await db
    .select()
    .from(secureMessages)
    .where(eq(secureMessages.clientId, clientId))
    .orderBy(secureMessages.sentAt);

  await recordAudit({
    actorId: actor.userId,
    action: "view",
    entity: "secure_messages",
    subjectClientId: clientId,
    detail: "opened a secure conversation",
  });

  return rows.map((m) => ({
    id: m.id,
    body: m.body,
    sentAt: m.sentAt,
    readAt: m.readAt,
    fromMe: m.senderId === actor.userId,
    fromStaff: isStaff(actor) ? m.senderId === actor.userId : m.senderId !== actor.userId,
  }));
}
