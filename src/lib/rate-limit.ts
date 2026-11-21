/**
 * A small in-memory rate limit, per serverless instance.
 *
 * Blunts casual spam on public forms; it is not robust protection, since each
 * instance keeps its own count (the same approach as the enquiry form).
 */
const buckets = new Map<string, number[]>();

export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return recent.length > max;
}
