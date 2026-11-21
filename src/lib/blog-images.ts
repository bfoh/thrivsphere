import "server-only";

import { get } from "@vercel/blob";
import { COVER_TYPES } from "@/lib/blog-rules";

/** Stream a blog cover photo from private storage. Callers decide who may see it. */
export async function serveCover(name: string, cacheControl: string): Promise<Response> {
  const ext = name.split(".").pop() ?? "";
  const type = Object.entries(COVER_TYPES).find(([, e]) => e === ext)?.[0];
  if (!type) return new Response("Not found", { status: 404 });
  let result;
  try {
    result = await get(`blog/${name}`, { access: "private" });
  } catch (err) {
    console.error("[blog] cover read failed", name, err);
    return new Response("Not found", { status: 404 });
  }
  if (!result?.stream) return new Response("Not found", { status: 404 });
  return new Response(result.stream, {
    headers: { "Content-Type": type, "Cache-Control": cacheControl, "X-Content-Type-Options": "nosniff" },
  });
}
