import { get } from "@vercel/blob";
import { getCurrentActor } from "@/lib/session";
import { can } from "@/lib/authz";
import { CONTENT_TYPES, blobPathFor, contentDisposition, parseAssetName, servedByRoute } from "@/lib/library/assets";

/**
 * A file from the resource library: a slide, a page, a picture in a guide,
 * a printable PDF or the owner's original.
 *
 * Staff only, and only library files: the name must be exactly
 * `<sha256>.<extension>`, so nothing in the URL can reach a client's
 * documents elsewhere in the same store. Not audited — these are the
 * service's own teaching materials, not anyone's record, and a single slide
 * show would otherwise write dozens of rows; opening a resource is logged by
 * its page instead.
 *
 * Each file is named after its content, so it never changes and the browser
 * may keep it: moving between slides costs nothing the second time.
 */
export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) return new Response("Unauthorized", { status: 401 });
  if (!can(actor, "library:read")) return new Response("Not found", { status: 404 });

  const { name } = await params;
  const parsed = parseAssetName(name);
  if (!parsed || !servedByRoute(parsed.ext)) return new Response("Not found", { status: 404 });

  let result;
  try {
    result = await get(blobPathFor(parsed.name), { access: "private" });
  } catch (err) {
    console.error("[library] asset read failed", parsed.name, err);
    return new Response("Not found", { status: 404 });
  }
  if (!result?.stream) return new Response("Not found", { status: 404 });

  const download = new URL(request.url).searchParams.get("download");
  return new Response(result.stream, {
    headers: {
      "Content-Type": CONTENT_TYPES[parsed.ext],
      "Content-Disposition": contentDisposition(parsed.ext, download),
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
