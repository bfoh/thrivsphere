import { createHash, randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { getDb } from "@/db";
import { marketingAssets } from "@/db/schema";
import { guardRoute, sameOrigin } from "@/lib/route-guard";
import { IMAGE_TYPES, imageSize, matchesSignature } from "@/lib/image-upload";
import { ASSET_LIMITS, parseAssetDetails } from "@/lib/asset-rules";

/**
 * Add a photo to the marketing library.
 *
 * A route rather than a Server Action because photos are often bigger than
 * the 1 MB a Server Action accepts. The file is checked to be the image it
 * claims to be and stored privately under a generated name.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Not allowed." }, { status: 403 });
  const actor = await guardRoute("marketing:write", { entity: "marketing_assets", action: "create", detail: "uploaded a marketing photo" });
  if (actor instanceof Response) return actor;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "That upload didn't arrive. Please try again." }, { status: 400 });
  }
  const get = (n: string) => {
    const v = form.get(n);
    return typeof v === "string" ? v : "";
  };
  const details = parseAssetDetails(get, { upload: true });
  if (!details.ok) return Response.json({ error: details.message }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose a photo." }, { status: 400 });
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return Response.json({ error: "Use a JPEG, PNG or WebP photo." }, { status: 400 });
  if (file.size === 0 || file.size > ASSET_LIMITS.maxBytes) return Response.json({ error: "Photos must be under 4 MB." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesSignature(file.type, bytes)) return Response.json({ error: "That file isn't the kind of photo it says it is." }, { status: 400 });
  const size = imageSize(file.type, bytes);

  const blobPath = `marketing/${randomUUID()}.${ext}`;
  try {
    await put(blobPath, Buffer.from(bytes), { access: "private", contentType: file.type, addRandomSuffix: false });
  } catch (err) {
    console.error("[marketing] upload failed", err);
    return Response.json({ error: "The upload failed. Please try again." }, { status: 502 });
  }

  const [row] = await getDb()
    .insert(marketingAssets)
    .values({
      blobPath,
      contentType: file.type,
      width: size?.width ?? null,
      height: size?.height ?? null,
      bytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      ...details.value,
      source: "upload",
      createdBy: actor.userId,
    })
    .returning({ id: marketingAssets.id });
  return Response.json({ id: row.id });
}
