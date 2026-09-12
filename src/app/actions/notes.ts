"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { sessionNotes } from "@/db/schema";
import { requireCapability, requireClientAccess } from "@/lib/guard";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz";
import type { NoteFormState } from "@/lib/note-state";

function str(fd: FormData, name: string) {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Add a session note.
 *
 * Notes are append-only: this only ever inserts. Correcting a note is a
 * separate action that adds an amendment and leaves the original text intact,
 * so the record cannot be quietly rewritten after the fact.
 */
export async function addSessionNote(
  _prev: NoteFormState,
  formData: FormData
): Promise<NoteFormState> {
  const clientId = str(formData, "clientId");
  const body = str(formData, "body");
  const agreedActions = str(formData, "agreedActions");

  if (!clientId) return { status: "error", message: "Missing client." };
  if (!body) return { status: "error", message: "A note needs some content." };
  if (body.length > 20000) return { status: "error", message: "That note is too long." };

  try {
    // Both checks: the capability to write notes at all, and access to this
    // particular client's record.
    const actor = await requireCapability("notes:write", {
      entity: "session_notes",
      subjectClientId: clientId,
      action: "create",
      detail: "added a session note",
    });
    await requireClientAccess(clientId, {
      entity: "session_notes",
      action: "create",
      detail: "added a session note",
    });

    await getDb().insert(sessionNotes).values({
      clientId,
      authorId: actor.userId,
      body,
      agreedActions: agreedActions || null,
    });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return { status: "error", message: "Your session has expired. Please sign in again." };
    }
    if (err instanceof ForbiddenError) {
      return { status: "error", message: "You do not have permission to add notes." };
    }
    throw err;
  }

  revalidatePath(`/admin/clients/${clientId}`);
  return { status: "ok", message: "Note saved." };
}
