import { createHash, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { blogLikes } from "@/db/schema";
import { isValidSlug } from "@/lib/blog-rules";
import { likeCount, publishedPostId } from "@/lib/queries/blog";
import { rateLimited } from "@/lib/rate-limit";

/**
 * Likes on a published post: GET reads the count and whether this browser
 * likes it; POST likes or unlikes.
 *
 * The browser is told apart by a random id in a cookie, set only when the
 * reader presses Like, so it is part of the thing they asked for. Only a hash
 * of the id is stored, with nothing else about the reader.
 */
const COOKIE = "ts_reader";

const hash = (id: string) => createHash("sha256").update(`blog-like:${id}`).digest("hex");

async function context(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  if (!isValidSlug(slug)) return null;
  const postId = await publishedPostId(slug);
  return postId ? { postId } : null;
}

async function liked(postId: string, readerId: string | undefined) {
  if (!readerId) return false;
  const [row] = await getDb()
    .select({ p: blogLikes.postId })
    .from(blogLikes)
    .where(and(eq(blogLikes.postId, postId), eq(blogLikes.readerHash, hash(readerId))))
    .limit(1);
  return !!row;
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const ctx = await context(params);
  if (!ctx) return json({ error: "Not found" }, 404);
  const readerId = (await cookies()).get(COOKIE)?.value;
  const [count, mine] = await Promise.all([likeCount(ctx.postId), liked(ctx.postId, readerId)]);
  return json({ count, liked: mine });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  // Same-site only, so another site can't press Like on a reader's behalf.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) return json({ error: "Not allowed." }, 403);

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(`like:${ip}`, 40, 10 * 60_000)) return json({ error: "Please try again in a few minutes." }, 429);

  const ctx = await context(params);
  if (!ctx) return json({ error: "Not found" }, 404);

  const jar = await cookies();
  let readerId = jar.get(COOKIE)?.value;
  if (!readerId || !/^[0-9a-f-]{36}$/i.test(readerId)) {
    readerId = randomUUID();
    jar.set(COOKIE, readerId, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }

  const db = getDb();
  const key = and(eq(blogLikes.postId, ctx.postId), eq(blogLikes.readerHash, hash(readerId)));
  if (await liked(ctx.postId, readerId)) {
    await db.delete(blogLikes).where(key);
  } else {
    await db.insert(blogLikes).values({ postId: ctx.postId, readerHash: hash(readerId) }).onConflictDoNothing();
  }
  const [count, mine] = await Promise.all([likeCount(ctx.postId), liked(ctx.postId, readerId)]);
  return json({ count, liked: mine });
}
