import { createHash, randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { getDb } from "@/db";
import { marketingAssets } from "@/db/schema";
import { guardRoute, sameOrigin } from "@/lib/route-guard";
import { parseGraphicInput, SIZES, templateByKey } from "@/lib/graphics/spec";
import { renderGraphic } from "@/lib/graphics/render";
import { resolveGraphic } from "@/lib/graphics/resolve";

export const maxDuration = 60;

/**
 * Branded graphics. GET draws a preview from the form's fields; POST draws
 * the same and keeps it in the library. Nothing here is AI: the templates
 * are drawn by the website with the brand's fonts and colours.
 */
export async function GET(request: Request) {
  const actor = await guardRoute("marketing:write", { entity: "marketing_assets", action: "view", detail: "previewed a graphic" });
  if (actor instanceof Response) return actor;
  const q = new URL(request.url).searchParams;
  const result = await draw((n) => q.get(n) ?? "");
  if ("error" in result) return Response.json({ error: result.error }, { status: 400 });
  return new Response(Buffer.from(result.png), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Not allowed." }, { status: 403 });
  const actor = await guardRoute("marketing:write", { entity: "marketing_assets", action: "create", detail: "saved a graphic to the library" });
  if (actor instanceof Response) return actor;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "That didn't arrive. Please try again." }, { status: 400 });
  }
  const result = await draw((n) => {
    const v = form.get(n);
    return typeof v === "string" ? v : "";
  });
  if ("error" in result) return Response.json({ error: result.error }, { status: 400 });

  const { png, resolved } = result;
  const { input } = resolved.graphic;
  const blobPath = `marketing/${randomUUID()}.png`;
  try {
    await put(blobPath, Buffer.from(png), { access: "private", contentType: "image/png", addRandomSuffix: false });
  } catch (err) {
    console.error("[marketing] graphic save failed", err);
    return Response.json({ error: "Saving failed. Please try again." }, { status: 502 });
  }
  const v = input.values;
  const title = (v.headline || v.day || v.caption || resolved.graphic.service?.title || resolved.graphic.post?.title || "Graphic").slice(0, 80);
  const def = templateByKey(input.template)!;
  const photo = resolved.photoAsset;
  const [row] = await getDb()
    .insert(marketingAssets)
    .values({
      blobPath,
      contentType: "image/png",
      width: SIZES[input.size].width,
      height: SIZES[input.size].height,
      bytes: png.byteLength,
      sha256: createHash("sha256").update(png).digest("hex"),
      title: `${def.label}: ${title}`.slice(0, 100),
      altText: resolved.altText.slice(0, 250),
      tags: [input.template, input.size],
      source: "template",
      // A graphic made from a library photo carries that photo's rights.
      rights: photo?.rights === "licensed" || photo?.rights === "staff_photo_consented" ? photo.rights : "owned",
      rightsNote: photo ? `Uses library photo ${photo.id}` : null,
      people: photo?.people === "staff_consented" ? "staff_consented" : "none",
      templateKey: input.template,
      templateInput: { size: input.size, theme: input.theme, ...input.values },
      kitVersionId: resolved.kitVersionId,
      createdBy: actor.userId,
    })
    .returning({ id: marketingAssets.id });
  return Response.json({ id: row.id });
}

async function draw(get: (n: string) => string) {
  const parsed = parseGraphicInput(get);
  if (!parsed.ok) return { error: parsed.message };
  const resolved = await resolveGraphic(parsed.input);
  if (!resolved.ok) return { error: resolved.message };
  try {
    return { png: await renderGraphic(resolved.graphic), resolved };
  } catch (err) {
    console.error("[marketing] render failed", parsed.input.template, err);
    return { error: "That graphic couldn't be drawn. Try shorter text." };
  }
}
