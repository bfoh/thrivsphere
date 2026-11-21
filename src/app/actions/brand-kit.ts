"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { brandKitApprovals, brandKitVersions } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { canApproveKit, kitProblems, parseKitForm, seedKit, type BrandKit } from "@/lib/brand-kit";
import { kitHash } from "@/lib/brand-kit-hash";
import type { MarketingFormState } from "@/lib/marketing-state";

const fail = (message: string, extra: Partial<MarketingFormState> = {}): MarketingFormState => ({ status: "error", message, ...extra });

function refresh() {
  revalidatePath("/admin/marketing");
  revalidatePath("/admin/marketing/brand");
}

async function latestVersion() {
  const [row] = await getDb().select().from(brandKitVersions).orderBy(desc(brandKitVersions.number)).limit(1);
  return row ?? null;
}

/** Save a new version. Versions are never edited, so the record shows every change. */
async function addVersion(content: BrandKit, note: string | null, userId: string) {
  const db = getDb();
  for (let attempt = 0; attempt < 3; attempt++) {
    const latest = await latestVersion();
    try {
      const [row] = await db
        .insert(brandKitVersions)
        .values({ number: (latest?.number ?? 0) + 1, content, contentHash: kitHash(content), note, createdBy: userId })
        .returning({ id: brandKitVersions.id, number: brandKitVersions.number });
      return row;
    } catch (err) {
      // Two people saving at once: take the next number and try again.
      if (attempt === 2) throw err;
    }
  }
  throw new Error("unreachable");
}

/** The first draft, from the website's own wording. */
export async function startKitFromWebsite(): Promise<MarketingFormState> {
  const actor = await requireCapability("brand:manage", { entity: "brand_kit_versions", action: "create", detail: "started the Brand Kit from the website" });
  if (await latestVersion()) return fail("The Brand Kit has already been started.");
  await addVersion(seedKit(), "First draft, from the website's wording", actor.userId);
  refresh();
  return { status: "ok", message: "Version 1 is ready for Patience to read and approve." };
}

export async function saveKitDraft(_prev: MarketingFormState, fd: FormData): Promise<MarketingFormState> {
  const actor = await requireCapability("brand:manage", { entity: "brand_kit_versions", action: "create", detail: "saved a Brand Kit draft" });
  const get = (n: string) => {
    const v = fd.get(n);
    return typeof v === "string" ? v : "";
  };
  const kit = parseKitForm(get);
  const problems = kitProblems(kit);
  if (problems.length) return fail("Please fix the points below before saving.", { problems });
  const latest = await latestVersion();
  if (latest && latest.contentHash === kitHash(kit)) return fail("Nothing has changed since the last version.");
  const note = get("note").trim().slice(0, 300) || null;
  const row = await addVersion(kit, note, actor.userId);
  refresh();
  return { status: "ok", message: `Saved as version ${row.number}. It is used once Patience approves it.` };
}

/** The founder approves one exact version: the newest, unchanged since she opened it. */
export async function approveKit(_prev: MarketingFormState, fd: FormData): Promise<MarketingFormState> {
  const versionId = String(fd.get("versionId") ?? "");
  const actor = await requireCapability("brand:manage", { entity: "brand_kit_versions", entityId: /^[0-9a-f-]{36}$/.test(versionId) ? versionId : null, action: "update", detail: "approved the Brand Kit" });
  if (!canApproveKit(actor)) return fail("Only the founder approves the Brand Kit.");
  if (fd.get("confirm") !== "on") return fail("Tick the box to confirm you have read this version.");
  const latest = await latestVersion();
  if (!latest || latest.id !== versionId) return fail("A newer version has been saved since this page was opened. Please reload and read that one.");
  if (latest.contentHash !== String(fd.get("contentHash") ?? "") || kitHash(latest.content) !== latest.contentHash) {
    return fail("This version has changed since the page was opened. Please reload.");
  }
  const problems = kitProblems(latest.content);
  if (problems.length) return fail("This version has problems to fix before it can be approved.", { problems });
  const [already] = await getDb().select({ id: brandKitApprovals.id }).from(brandKitApprovals).where(eq(brandKitApprovals.versionId, latest.id)).limit(1);
  if (already) return fail("This version is already approved.");
  await getDb().insert(brandKitApprovals).values({ versionId: latest.id, contentHash: latest.contentHash, approvedBy: actor.userId });
  refresh();
  return { status: "ok", message: `Version ${latest.number} is approved. Everything in the hub now uses it.` };
}
