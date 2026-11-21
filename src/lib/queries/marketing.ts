import "server-only";

import { and, desc, eq, isNull, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { aiUsage, brandKitApprovals, brandKitVersions, marketingAssets, users } from "@/db/schema";
import { kitStatus, seedKit, type BrandKit } from "@/lib/brand-kit";

/** Every Brand Kit version (newest first), with who made and approved each. */
export async function getKitHistory() {
  const db = getDb();
  const [versions, approvals] = await Promise.all([
    db
      .select({
        id: brandKitVersions.id,
        number: brandKitVersions.number,
        contentHash: brandKitVersions.contentHash,
        note: brandKitVersions.note,
        createdAt: brandKitVersions.createdAt,
        createdByName: users.displayName,
      })
      .from(brandKitVersions)
      .leftJoin(users, eq(users.id, brandKitVersions.createdBy))
      .orderBy(desc(brandKitVersions.number)),
    db
      .select({
        versionId: brandKitApprovals.versionId,
        contentHash: brandKitApprovals.contentHash,
        approvedAt: brandKitApprovals.approvedAt,
        approvedByName: users.displayName,
      })
      .from(brandKitApprovals)
      .leftJoin(users, eq(users.id, brandKitApprovals.approvedBy))
      .orderBy(desc(brandKitApprovals.approvedAt)),
  ]);
  return { versions, approvals, status: kitStatus(versions, approvals) };
}

export async function getKitVersion(id: string) {
  const [row] = await getDb().select().from(brandKitVersions).where(eq(brandKitVersions.id, id)).limit(1);
  return row ?? null;
}

/**
 * The kit everything uses: the newest approved version. Before the founder
 * approves the first one, the website's own wording stands in, marked so.
 */
export async function getApprovedKit(): Promise<{ kit: BrandKit; versionId: string | null; number: number | null }> {
  const fallback = { kit: seedKit(), versionId: null, number: null };
  try {
    const { status } = await getKitHistory();
    if (!status.approved) return fallback;
    const row = await getKitVersion(status.approved.id);
    return row ? { kit: row.content, versionId: row.id, number: row.number } : fallback;
  } catch (err) {
    // Public pictures (link previews) must not fail because the kit can't be read.
    console.error("[marketing] brand kit unavailable; using the website's wording", err);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// The library

export type AssetRow = typeof marketingAssets.$inferSelect;

export async function listAssets(o: { archived?: boolean; photosOnly?: boolean } = {}) {
  const conditions = [o.archived ? isNotNull(marketingAssets.archivedAt) : isNull(marketingAssets.archivedAt)];
  if (o.photosOnly) conditions.push(eq(marketingAssets.source, "upload"));
  return getDb()
    .select({ asset: marketingAssets, createdByName: users.displayName })
    .from(marketingAssets)
    .leftJoin(users, eq(users.id, marketingAssets.createdBy))
    .where(and(...conditions))
    .orderBy(desc(marketingAssets.createdAt))
    .limit(300);
}

export async function getAsset(id: string): Promise<AssetRow | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [row] = await getDb().select().from(marketingAssets).where(eq(marketingAssets.id, id)).limit(1);
  return row ?? null;
}

export async function assetCounts() {
  const [row] = await getDb()
    .select({
      photos: sql<number>`count(*) filter (where ${marketingAssets.source} = 'upload' and ${marketingAssets.archivedAt} is null)::int`,
      graphics: sql<number>`count(*) filter (where ${marketingAssets.source} <> 'upload' and ${marketingAssets.archivedAt} is null)::int`,
      missingAlt: sql<number>`count(*) filter (where coalesce(${marketingAssets.altText}, '') = '' and ${marketingAssets.archivedAt} is null)::int`,
      expiring: sql<number>`count(*) filter (where ${marketingAssets.licenceExpires} < (now() + interval '30 days')::date and ${marketingAssets.archivedAt} is null)::int`,
    })
    .from(marketingAssets);
  return row ?? { photos: 0, graphics: 0, missingAlt: 0, expiring: 0 };
}

// ---------------------------------------------------------------------------
// AI usage

/** Start of this calendar month in UK time, as SQL. */
const MONTH_START = sql`(date_trunc('month', now() at time zone 'Europe/London') at time zone 'Europe/London')`;

export async function aiSpendThisMonth(): Promise<number> {
  const [row] = await getDb()
    .select({ micro: sql<string>`coalesce(sum(${aiUsage.costMicroUsd}), 0)::bigint` })
    .from(aiUsage)
    .where(sql`${aiUsage.createdAt} >= ${MONTH_START}`);
  return Number(row?.micro ?? 0) / 1_000_000;
}

export async function aiUsageReport() {
  const db = getDb();
  const [byFeature, recent] = await Promise.all([
    db
      .select({
        feature: aiUsage.feature,
        requests: sql<number>`count(*)::int`,
        failed: sql<number>`count(*) filter (where ${aiUsage.outcome} <> 'ok')::int`,
        micro: sql<string>`coalesce(sum(${aiUsage.costMicroUsd}), 0)::bigint`,
      })
      .from(aiUsage)
      .where(sql`${aiUsage.createdAt} >= ${MONTH_START}`)
      .groupBy(aiUsage.feature)
      .orderBy(sql`4 desc`),
    db
      .select({ row: aiUsage, actorName: users.displayName })
      .from(aiUsage)
      .leftJoin(users, eq(users.id, aiUsage.actorId))
      .orderBy(desc(aiUsage.createdAt))
      .limit(50),
  ]);
  return { byFeature: byFeature.map((f) => ({ ...f, usd: Number(f.micro) / 1_000_000 })), recent };
}
