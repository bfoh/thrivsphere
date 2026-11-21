import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { requireCapability } from "@/lib/guard";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz";
import { COVER_MAX_BYTES, COVER_TYPES } from "@/lib/blog-rules";

/**
 * Upload a cover photo for a blog post.
 *
 * A route rather than a Server Action because photos are often bigger than
 * the 1 MB a Server Action accepts. Only stores the photo and returns its
 * name: it joins the post when the editor is saved, as part of a version that
 * a reviewer approves like everything else.
 */
const SIGNATURES: Record<string, (b: Uint8Array) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/webp": (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP",
};

export async function POST(request: Request) {
  // Same-site only: a form on another site can't add files to our storage.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) return Response.json({ error: "Not allowed." }, { status: 403 });

  try {
    await requireCapability("blog:write", { entity: "blog_posts", action: "create", detail: "uploaded a blog cover photo" });
  } catch (err) {
    if (err instanceof UnauthenticatedError) return Response.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
    if (err instanceof ForbiddenError) return Response.json({ error: err.message }, { status: 403 });
    throw err;
  }

  let file: FormDataEntryValue | null = null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return Response.json({ error: "That upload didn't arrive. Please try again." }, { status: 400 });
  }
  if (!(file instanceof File)) return Response.json({ error: "Choose a photo." }, { status: 400 });
  const ext = COVER_TYPES[file.type];
  if (!ext) return Response.json({ error: "Use a JPEG, PNG or WebP photo." }, { status: 400 });
  if (file.size === 0 || file.size > COVER_MAX_BYTES) return Response.json({ error: "Photos must be under 4 MB." }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!SIGNATURES[file.type](bytes)) return Response.json({ error: "That file isn't the kind of photo it says it is." }, { status: 400 });

  const name = `${randomUUID()}.${ext}`;
  try {
    await put(`blog/${name}`, Buffer.from(bytes), { access: "private", contentType: file.type, addRandomSuffix: false });
  } catch (err) {
    console.error("[blog] cover upload failed", err);
    return Response.json({ error: "The upload failed. Please try again." }, { status: 502 });
  }
  return Response.json({ name });
}
