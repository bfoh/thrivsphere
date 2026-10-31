import { services as seedServices, type Service } from "@/data/site";

type ServiceRow = {
  slug: string;
  name: string;
  summary: string | null;
  description: string;
  points: string[] | null;
  note: string | null;
};

const ICONS = new Map(seedServices.map((s) => [s.slug, s.icon]));

/**
 * A service as the public pages show it.
 *
 * The wording comes from the database, where the owner edits it. The icon is
 * part of the design rather than the content, so it stays in code, and a
 * service added later gets a neutral one.
 */
export function toService(row: ServiceRow): Service {
  return {
    slug: row.slug,
    icon: ICONS.get(row.slug) ?? "heart",
    title: row.name,
    summary: row.summary ?? "",
    desc: row.description,
    points: row.points ?? [],
    ...(row.note ? { note: row.note } : {}),
  };
}
