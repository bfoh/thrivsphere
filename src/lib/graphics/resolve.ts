import "server-only";

import { get } from "@vercel/blob";
import { getApprovedKit, getAsset } from "@/lib/queries/marketing";
import { getPublishedServices } from "@/lib/queries/catalogue";
import { getPublishedPost } from "@/lib/queries/blog";
import { COVER_TYPES } from "@/lib/blog-rules";
import type { ResolvedGraphic } from "./render";
import type { GraphicInput } from "./spec";

/** Photos a template can draw. WebP isn't supported by the renderer. */
export const DRAWABLE = ["image/jpeg", "image/png"];

async function blobDataUrl(path: string, type: string): Promise<string | null> {
  try {
    const result = await get(path, { access: "private" });
    if (!result?.stream) return null;
    const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch (err) {
    console.error("[graphics] photo read failed", path, err);
    return null;
  }
}

export type Resolved = { ok: true; graphic: ResolvedGraphic; altText: string; kitVersionId: string | null; photoAsset: { id: string; rights: string; people: string } | null } | { ok: false; message: string };

/** Look up everything a graphic refers to, and describe it for alt text. */
export async function resolveGraphic(input: GraphicInput): Promise<Resolved> {
  const { kit, versionId } = await getApprovedKit();
  const graphic: ResolvedGraphic = { input, kit };
  const v = input.values;
  let photoAsset: { id: string; rights: string; people: string } | null = null;

  if (input.template === "photo") {
    const asset = await getAsset(v.photo ?? "");
    if (!asset || asset.archivedAt) return { ok: false, message: "That photo isn't in the library any more." };
    if (!DRAWABLE.includes(asset.contentType)) return { ok: false, message: "Use a JPEG or PNG photo for graphics." };
    graphic.photo = await blobDataUrl(asset.blobPath, asset.contentType);
    if (!graphic.photo) return { ok: false, message: "The photo couldn't be read. Please try again." };
    photoAsset = { id: asset.id, rights: asset.rights, people: asset.people };
  }

  if (input.template === "service") {
    const s = (await getPublishedServices()).find((x) => x.slug === v.service);
    if (!s) return { ok: false, message: "Choose one of the services on the website." };
    graphic.service = { title: s.title, summary: s.summary };
  }

  if (input.template === "blog") {
    const post = await getPublishedPost(v.post ?? "");
    if (!post) return { ok: false, message: "Choose a published blog post." };
    const ext = post.coverImage?.split(".").pop() ?? "";
    const type = Object.entries(COVER_TYPES).find(([, e]) => e === ext)?.[0];
    const cover = post.coverImage && type && DRAWABLE.includes(type) ? await blobDataUrl(`blog/${post.coverImage}`, type) : null;
    graphic.post = { title: post.title, category: post.category, cover };
  }

  return { ok: true, graphic, altText: describe(graphic), kitVersionId: versionId, photoAsset };
}

/** Alt text that says what the graphic says. Staff can edit it in the library. */
function describe(g: ResolvedGraphic): string {
  const v = g.input.values;
  const brand = "ThriveSphere Wellbeing graphic";
  const join = (...parts: (string | undefined | null)[]) => parts.filter(Boolean).join(". ").replace(/\.\./g, ".");
  switch (g.input.template) {
    case "tip":
      return `${brand}: ${join(v.eyebrow, v.headline, v.body)}`;
    case "slide":
      return `${brand}, step ${v.number} of ${v.total}: ${join(v.headline, v.body)}`;
    case "awareness":
      return `${brand} for ${v.day}, ${v.date}: ${join(v.message, g.kit.boilerplates.crisisLine)}`;
    case "service":
      return `${brand}: ${join(g.service?.title, v.line || g.service?.summary, v.cta)}`;
    case "announcement":
      return `${brand}: ${join(v.headline, v.when, v.details, v.cta)}`;
    case "photo":
      return `Photo with the caption: ${v.caption}`;
    case "blog":
      return `${brand} for the blog post "${g.post?.title}"`;
  }
}
