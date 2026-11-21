import { isCoverName } from "@/lib/blog-rules";
import { serveCover } from "@/lib/blog-images";
import { isPublishedCover } from "@/lib/queries/blog";

/**
 * A published post's cover photo.
 *
 * Stored privately and served from here, so only photos on a post that is on
 * the website can be reached: a draft's photo stays out of reach even if its
 * name were guessed. Staff preview drafts through /api/admin/blog/images.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!isCoverName(name) || !(await isPublishedCover(name))) return new Response("Not found", { status: 404 });
  return serveCover(name, "public, max-age=3600, s-maxage=86400");
}
