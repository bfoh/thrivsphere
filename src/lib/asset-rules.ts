/**
 * The photo and graphics library: what may be recorded about an image.
 * Pure, shared by the upload route, the details form and the tests.
 */

export const RIGHTS = [
  { value: "owned", label: "Ours (we took or made it)" },
  { value: "staff_photo_consented", label: "A staff photo, with their written agreement" },
  { value: "licensed", label: "Licensed (e.g. stock photo)" },
  { value: "generated", label: "Made by AI" },
] as const;

/** Who is in it. A client is never an option. */
export const PEOPLE = [
  { value: "none", label: "No people" },
  { value: "staff_consented", label: "ThriveSphere staff who have agreed in writing" },
] as const;

export type AssetRights = (typeof RIGHTS)[number]["value"];
export type AssetPeople = (typeof PEOPLE)[number]["value"];

export const rightsLabel = (v: string) => RIGHTS.find((r) => r.value === v)?.label ?? v;
export const peopleLabel = (v: string) => PEOPLE.find((p) => p.value === v)?.label ?? v;

export const ASSET_LIMITS = { title: 100, alt: 250, rightsNote: 300, tags: 12, tag: 30, maxBytes: 4 * 1024 * 1024 };

export type AssetDetails = {
  title: string;
  altText: string | null;
  tags: string[];
  rights: AssetRights;
  rightsNote: string | null;
  people: AssetPeople;
  licenceExpires: string | null;
};

/** Check the details typed for an image. Uploads may not choose "Made by AI". */
export function parseAssetDetails(get: (n: string) => string, o: { upload: boolean }): { ok: true; value: AssetDetails } | { ok: false; message: string } {
  const title = get("title").trim().replace(/\s+/g, " ").slice(0, ASSET_LIMITS.title);
  if (!title) return { ok: false, message: "Give the image a short name." };
  const rights = get("rights") as AssetRights;
  if (!RIGHTS.some((r) => r.value === rights) || (o.upload && rights === "generated")) return { ok: false, message: "Say whose image this is." };
  const people = (get("people") || "none") as AssetPeople;
  if (!PEOPLE.some((p) => p.value === people)) return { ok: false, message: "Say who is in the image." };
  if (people === "staff_consented" && get("staffConsent") !== "on" && o.upload) {
    return { ok: false, message: "Confirm the staff in the photo have agreed in writing." };
  }
  const rightsNote = get("rightsNote").trim().slice(0, ASSET_LIMITS.rightsNote) || null;
  if (rights === "licensed" && !rightsNote) return { ok: false, message: "For a licensed image, say where it's from (e.g. the stock site and licence)." };
  const expires = get("licenceExpires").trim();
  if (expires && !/^\d{4}-\d{2}-\d{2}$/.test(expires)) return { ok: false, message: "Write the licence end date as a date." };
  const tags = [...new Set(get("tags").split(",").map((t) => t.trim().toLowerCase().replace(/\s+/g, "-").slice(0, ASSET_LIMITS.tag)).filter(Boolean))].slice(0, ASSET_LIMITS.tags);
  return {
    ok: true,
    value: {
      title,
      altText: get("altText").trim().replace(/\s+/g, " ").slice(0, ASSET_LIMITS.alt) || null,
      tags,
      rights,
      rightsNote,
      people,
      licenceExpires: expires || null,
    },
  };
}
