import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { documents } from "@/db/schema";
import { getCurrentActor } from "@/lib/session";
import { canAccessClient, isStaff } from "@/lib/authz";
import { recordAudit } from "@/lib/audit";
import { sanitiseFilename } from "@/lib/upload-rules";

/**
 * Authenticated download.
 *
 * The blob itself is private, so this is the only way to read a document. Every
 * request is authorised and audited — who opened which client's paperwork, and
 * when, is exactly what an information-governance review asks for.
 *
 * A client may only read documents on their own record, and only those a
 * practitioner marked visible to them; internal notes uploaded about someone
 * are not theirs to browse by default.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const actor = await getCurrentActor();

  if (!actor) {
    await recordAudit({
      actorId: null,
      action: "permission_denied",
      entity: "documents",
      entityId: id,
      detail: "unauthenticated document request",
    });
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getDb();
  const [doc] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);

  // Deliberately the same response as a real denial, so this cannot be used to
  // discover which document ids exist.
  if (!doc) return new Response("Not found", { status: 404 });

  const permitted =
    canAccessClient(actor, doc.clientId) && (isStaff(actor) || doc.visibleToClient);

  if (!permitted) {
    await recordAudit({
      actorId: actor.userId,
      action: "permission_denied",
      entity: "documents",
      entityId: id,
      subjectClientId: doc.clientId,
      detail: "attempted to download a document they may not see",
    });
    return new Response("Not found", { status: 404 });
  }

  // `get` with access: "private" is the only way to read a private blob — the
  // blob's plain URL returns 403 to anyone, including us.
  let result;
  try {
    result = await get(doc.blobPath, { access: "private" });
  } catch (err) {
    console.error("[documents] blob read failed", doc.blobPath, err);
    return new Response("That file is no longer available", { status: 404 });
  }

  if (!result?.stream) {
    return new Response("That file is no longer available", { status: 404 });
  }

  await recordAudit({
    actorId: actor.userId,
    action: "view",
    entity: "documents",
    entityId: id,
    subjectClientId: doc.clientId,
    detail: `downloaded ${doc.filename}`,
  });

  return new Response(result.stream, {
    headers: {
      "Content-Type": doc.contentType,
      // `attachment` rather than inline: nothing uploaded to a client record
      // should ever be rendered by the browser in our own origin.
      "Content-Disposition": `attachment; filename="${sanitiseFilename(doc.filename)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
