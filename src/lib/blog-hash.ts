import { createHash } from "node:crypto";
import type { BlogContent } from "./blog-rules";

/**
 * A fingerprint of everything a reader would see.
 *
 * Stored with each version and with each approval, so publishing can prove
 * that what goes live is exactly what the reviewer approved. Field order is
 * fixed here rather than left to object key order.
 */
export function contentHash(c: BlogContent): string {
  const canonical = JSON.stringify([
    c.title,
    c.category,
    c.excerpt,
    c.metaDescription ?? null,
    c.body,
    c.sources.map((s) => [s.title, s.publisher ?? null, s.url, s.accessed ?? null]),
    c.coverImage ?? null,
    c.coverAlt ?? null,
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}
