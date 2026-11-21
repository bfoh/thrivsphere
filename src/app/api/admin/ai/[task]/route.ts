import { get } from "@vercel/blob";
import { guardRoute, sameOrigin } from "@/lib/route-guard";
import { rateLimited } from "@/lib/rate-limit";
import { getAsset } from "@/lib/queries/marketing";
import { runTask } from "@/lib/ai/run";
import { TASKS, isTaskKey, parseTaskInput } from "@/lib/ai/tasks";

/**
 * AI help for staff. A route rather than a Server Action, because Next runs a
 * page's Server Actions one at a time and an AI answer can take a while.
 * Results only fill the editor; nothing is saved or published here.
 */
export const maxDuration = 120;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_IMAGE_BYTES = 3_750_000;

export async function POST(request: Request, { params }: { params: Promise<{ task: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: "Not allowed." }, { status: 403 });
  const { task } = await params;
  if (!isTaskKey(task)) return Response.json({ error: "Unknown request." }, { status: 404 });
  const settings = TASKS[task];

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "That request didn't arrive. Please try again." }, { status: 400 });
  }
  const parsed = parseTaskInput(task, body);
  const entityId = parsed.ok ? ((parsed.input as { postId?: string; assetId?: string }).postId ?? (parsed.input as { assetId?: string }).assetId ?? null) : null;

  const actor = await guardRoute(settings.capability, { entity: settings.entity, entityId, action: "view", detail: `asked AI: ${settings.label.toLowerCase()}` });
  if (actor instanceof Response) return actor;
  if (!parsed.ok) return Response.json({ error: parsed.message }, { status: 400 });
  if (rateLimited(`ai:${actor.userId}`, 30, 10 * 60_000)) return Response.json({ error: "That's a lot of AI requests in a short time. Please wait a few minutes." }, { status: 429 });

  let image: { type: (typeof IMAGE_TYPES)[number]; base64: string } | undefined;
  if (task === "image-alt") {
    const asset = await getAsset((parsed.input as { assetId: string }).assetId);
    if (!asset || asset.archivedAt) return Response.json({ error: "That image isn't in the library." }, { status: 404 });
    const type = IMAGE_TYPES.find((t) => t === asset.contentType);
    if (!type) return Response.json({ error: "This kind of image can't be described automatically." }, { status: 400 });
    // Under the API's 5 MB per image once encoded.
    if (asset.bytes > MAX_IMAGE_BYTES) return Response.json({ error: "This photo is too large to describe automatically. Please write the description yourself." }, { status: 400 });
    try {
      const file = await get(asset.blobPath, { access: "private" });
      if (!file?.stream) throw new Error("no stream");
      image = { type, base64: Buffer.from(await new Response(file.stream).arrayBuffer()).toString("base64") };
    } catch (err) {
      console.error("[ai] image read failed", asset.blobPath, err);
      return Response.json({ error: "The image couldn't be read. Please try again." }, { status: 502 });
    }
  }

  const result = await runTask(task, parsed.input, { actorId: actor.userId, entityId, image });
  if (!result.ok) return Response.json({ error: result.message }, { status: result.status });
  return Response.json({ output: result.output });
}
