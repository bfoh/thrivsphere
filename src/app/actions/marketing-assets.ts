"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { marketingAssets } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { parseAssetDetails } from "@/lib/asset-rules";
import { getAsset } from "@/lib/queries/marketing";
import type { MarketingFormState } from "@/lib/marketing-state";

const str = (fd: FormData, n: string) => {
  const v = fd.get(n);
  return typeof v === "string" ? v : "";
};

export async function updateAsset(_prev: MarketingFormState, fd: FormData): Promise<MarketingFormState> {
  const id = str(fd, "id");
  await requireCapability("marketing:write", { entity: "marketing_assets", entityId: /^[0-9a-f-]{36}$/.test(id) ? id : null, action: "update", detail: "updated an image's details" });
  const asset = await getAsset(id);
  if (!asset) return { status: "error", message: "That image isn't in the library." };
  const parsed = parseAssetDetails((n) => str(fd, n), { upload: false });
  if (!parsed.ok) return { status: "error", message: parsed.message };
  // AI-made images stay marked as AI-made, whatever is chosen.
  const value = asset.source === "ai_generated" ? { ...parsed.value, rights: "generated" as const } : parsed.value;
  if (asset.source !== "ai_generated" && value.rights === "generated") return { status: "error", message: "Only images made by the AI generator are marked as AI-made." };
  await getDb().update(marketingAssets).set(value).where(eq(marketingAssets.id, id));
  revalidatePath("/admin/marketing/library");
  revalidatePath(`/admin/marketing/library/${id}`);
  return { status: "ok", message: "Saved." };
}

/** Archive hides an image from pickers; the file is kept for the record. */
export async function setArchived(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  const archive = str(fd, "archive") === "1";
  await requireCapability("marketing:write", { entity: "marketing_assets", entityId: /^[0-9a-f-]{36}$/.test(id) ? id : null, action: "update", detail: archive ? "archived an image" : "restored an image" });
  if (!(await getAsset(id))) return;
  await getDb().update(marketingAssets).set({ archivedAt: archive ? new Date() : null }).where(eq(marketingAssets.id, id));
  revalidatePath("/admin/marketing/library");
  revalidatePath(`/admin/marketing/library/${id}`);
}
