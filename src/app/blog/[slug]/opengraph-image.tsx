import { renderGraphic } from "@/lib/graphics/render";
import { resolveGraphic } from "@/lib/graphics/resolve";
import { isValidSlug } from "@/lib/blog-rules";

/** The picture shown when someone shares a blog post: its title, category and cover photo. */
export const alt = "A ThriveSphere Wellbeing blog post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isValidSlug(slug)) return new Response("Not found", { status: 404 });
  const resolved = await resolveGraphic({ template: "blog", size: "facebook", theme: "navy", values: { post: slug } });
  if (!resolved.ok) return new Response("Not found", { status: 404 });
  const png = await renderGraphic(resolved.graphic);
  return new Response(Buffer.from(png), { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
