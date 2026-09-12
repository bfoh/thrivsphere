"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { documents } from "@/db/schema";
import { requireCapability, requireClientAccess } from "@/lib/guard";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz";
import { buildBlobPath, checkUpload, sanitiseFilename } from "@/lib/upload-rules";
import type { DocumentState } from "@/lib/document-state";

function mapGuardError(err: unknown): DocumentState | null {
  if (err instanceof UnauthenticatedError) {
    return { status: "error", message: "Your session has expired. Please sign in again." };
  }
  if (err instanceof ForbiddenError) {
    return { status: "error", message: "You do not have permission to do that." };
  }
  return null;
}

/**
 * Upload a document to a client record.
 *
 * Stored with `access: "private"`, so the blob has no publicly guessable URL
 * and can only be read back through the authenticated route in
 * app/api/documents/[id]. A client's paperwork is health-adjacent personal
 * data; it must never sit behind a URL that works for anyone who has it.
 */
export async function uploadDocument(
  _prev: DocumentState,
  formData: FormData
): Promise<DocumentState> {
  const clientId = String(formData.get("clientId") ?? "").trim();
  const category = String(formData.get("category") ?? "other").trim();
  const visibleToClient = formData.get("visibleToClient") === "on";
  const file = formData.get("file");

  if (!clientId) return { status: "error", message: "Missing client." };
  if (!(file instanceof File)) return { status: "error", message: "Please choose a file." };

  const check = checkUpload({ name: file.name, type: file.type, size: file.size });
  if (!check.ok) return { status: "error", message: check.reason };

  let actor;
  try {
    actor = await requireCapability("document:write:any", {
      entity: "documents",
      subjectClientId: clientId,
      action: "create",
      detail: `uploaded ${sanitiseFilename(file.name)}`,
    });
    await requireClientAccess(clientId, {
      entity: "documents",
      action: "create",
      detail: "uploaded a document",
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  const pathname = buildBlobPath(clientId, file.name, randomUUID());

  let blob;
  try {
    blob = await put(pathname, file, {
      access: "private",
      contentType: file.type,
      // The path already carries a UUID; adding another suffix would make the
      // stored path impossible to match back to the row.
      addRandomSuffix: false,
    });
  } catch (err) {
    console.error("[documents] blob upload failed", err);
    return { status: "error", message: "The upload failed. Please try again." };
  }

  await getDb().insert(documents).values({
    clientId,
    category: category as "other",
    filename: sanitiseFilename(file.name),
    contentType: file.type,
    sizeBytes: String(file.size),
    blobPath: blob.pathname,
    uploadedBy: actor.userId,
    visibleToClient,
  });

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/portal/documents");
  return { status: "ok", message: "Document uploaded." };
}

/** Remove a document from the record and from storage. */
export async function deleteDocument(
  _prev: DocumentState,
  formData: FormData
): Promise<DocumentState> {
  const documentId = String(formData.get("documentId") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "").trim();
  if (!documentId) return { status: "error", message: "Missing document." };

  try {
    await requireCapability("document:write:any", {
      entity: "documents",
      entityId: documentId,
      subjectClientId: clientId || null,
      action: "delete",
      detail: "deleted a document",
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  const db = getDb();
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (!doc) return { status: "error", message: "That document no longer exists." };

  // Remove the row first: a database row pointing at a missing blob is a
  // broken link, whereas an orphaned blob is invisible but still stored, which
  // is the worse outcome for data we promised to delete.
  await db.delete(documents).where(eq(documents.id, documentId));
  try {
    await del(doc.blobPath);
  } catch (err) {
    console.error("[documents] blob delete failed; orphan left in store", doc.blobPath, err);
  }

  revalidatePath(`/admin/clients/${clientId}`);
  return { status: "ok", message: "Document deleted." };
}
