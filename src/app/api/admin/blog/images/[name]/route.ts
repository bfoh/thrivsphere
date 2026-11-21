import { getCurrentActor } from "@/lib/session";
import { can } from "@/lib/authz";
import { isCoverName } from "@/lib/blog-rules";
import { serveCover } from "@/lib/blog-images";

/** Any blog cover photo, drafts included, for staff who write posts. */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) return new Response("Unauthorized", { status: 401 });
  if (!can(actor, "blog:write")) return new Response("Not found", { status: 404 });
  const { name } = await params;
  if (!isCoverName(name)) return new Response("Not found", { status: 404 });
  return serveCover(name, "private, max-age=31536000, immutable");
}
