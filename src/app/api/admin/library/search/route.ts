import { getCurrentActor } from "@/lib/session";
import { can } from "@/lib/authz";
import { getLibrary, getSearchIndex } from "@/lib/library/manifest";

/**
 * The library's search index, for searching in the browser as staff type.
 *
 * The page asks for it with the manifest's name in `?v=`, so a new build of
 * the library is a new address and the browser's copy can be kept until then.
 */
export async function GET(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return new Response("Unauthorized", { status: 401 });
  if (!can(actor, "library:read")) return new Response("Not found", { status: 404 });

  const library = await getLibrary();
  if (!library) return new Response("Not found", { status: 404 });

  let index;
  try {
    index = await getSearchIndex(library);
  } catch (err) {
    console.error("[library] search index read failed", err);
    return new Response("The search index is unavailable", { status: 503 });
  }

  const versioned = new URL(request.url).searchParams.get("v") === library.search;
  return Response.json(index, {
    headers: {
      "Cache-Control": versioned ? "private, max-age=31536000, immutable" : "private, no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
