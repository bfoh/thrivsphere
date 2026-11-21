import { get } from "@vercel/blob";
import { guardRoute } from "@/lib/route-guard";
import { getAsset } from "@/lib/queries/marketing";

/** A library image, for staff only. `?download=1` saves it with a readable name. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const download = new URL(request.url).searchParams.get("download") === "1";
  const actor = await guardRoute("marketing:write", { entity: "marketing_assets", entityId: /^[0-9a-f-]{36}$/.test(id) ? id : null, action: download ? "export" : "view", detail: download ? "downloaded a marketing image" : null });
  if (actor instanceof Response) return actor;

  const asset = await getAsset(id);
  if (!asset) return new Response("Not found", { status: 404 });
  let result;
  try {
    result = await get(asset.blobPath, { access: "private" });
  } catch (err) {
    console.error("[marketing] read failed", asset.blobPath, err);
    return new Response("Not found", { status: 404 });
  }
  if (!result?.stream) return new Response("Not found", { status: 404 });

  const ext = asset.blobPath.split(".").pop();
  const name = `${asset.title.replace(/[^A-Za-z0-9 _-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "image"}.${ext}`;
  return new Response(result.stream, {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      ...(download ? { "Content-Disposition": `attachment; filename="${name}"` } : {}),
    },
  });
}
