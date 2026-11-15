import type { MaterialKind, SeriesKey } from "./catalogue";
import type { CollectionLookup } from "./search";
import type { DocSection, LibraryManifest, LibraryMaterial } from "./types";

/**
 * Shapes of the library for the pages: what the browsing page sends to the
 * browser (only what a card shows), and the links into a resource.
 */

export type MaterialCard = {
  id: string;
  kind: MaterialKind;
  title: string;
  subtitle: string | null;
  format: LibraryMaterial["format"];
  cover: string;
  /** "12 slides", "4 pages". */
  extent: string;
};

export type CollectionCard = {
  slug: string;
  series: SeriesKey;
  label: string | null;
  title: string;
  summary: string | null;
  cover: string;
  /** Whether the cover is a portrait page rather than a slide. */
  portrait: boolean;
  materials: MaterialCard[];
};

export const LIBRARY_HOME = "/admin/library";

export function extentOf(m: LibraryMaterial): string {
  const n = m.pageCount;
  if (m.format === "slides") return `${n} ${n === 1 ? "slide" : "slides"}`;
  return `${n} ${n === 1 ? "page" : "pages"}`;
}

export function toCards(library: LibraryManifest): CollectionCard[] {
  return library.collections.map((c) => {
    const coverOwner = c.materials.find((m) => m.cover === c.cover);
    return {
      slug: c.slug,
      series: c.series,
      label: c.label,
      title: c.title,
      summary: summaryLine(c.summary),
      cover: c.cover,
      portrait: !!coverOwner && coverOwner.format !== "slides",
      materials: c.materials.map((m) => ({
        id: m.id,
        kind: m.kind,
        title: m.title,
        subtitle: m.subtitle,
        format: m.format,
        cover: m.cover,
        extent: extentOf(m),
      })),
    };
  });
}

export function lookupFor(cards: Pick<CollectionCard, "slug" | "series" | "materials">[]): CollectionLookup {
  return new Map(cards.map((c) => [c.slug, { series: c.series, materials: c.materials.map((m) => ({ id: m.id, kind: m.kind })) }]));
}

export const collectionHref = (slug: string) => `${LIBRARY_HOME}/${encodeURIComponent(slug)}`;

/**
 * A link to a resource, or to a place in one: a section of a guide (with the
 * words searched for highlighted), a slide, or a page.
 */
export function materialHref(slug: string, materialId: string, at: string | null = null, query = ""): string {
  const base = `${collectionHref(slug)}/${encodeURIComponent(materialId)}`;
  if (!at) return base;
  const slide = at.match(/^slide-(\d+)$/);
  if (slide) return `${base}?slide=${slide[1]}`;
  if (/^page-\d+$/.test(at)) return `${base}#${at}`;
  if (/^s\d+$/.test(at)) return `${base}${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}#${at}`;
  return base;
}

/**
 * A document's contents for the side panel: titles dropped, and levels
 * shifted so the top level present is level 1, whatever the document called it.
 */
export function contentsOf(sections: DocSection[]): DocSection[] {
  const listed = sections.filter((s) => s.level >= 1 && s.title.trim());
  if (!listed.length) return [];
  const top = Math.min(...listed.map((s) => s.level));
  return listed.map((s) => ({ ...s, level: Math.min(3, s.level - top + 1) }));
}

/** The slide number in `?slide=`, kept within the deck. */
export function slideFromParam(value: string | string[] | undefined, count: number): number {
  const n = Number.parseInt(Array.isArray(value) ? value[0] : value ?? "", 10);
  if (!Number.isFinite(n) || count < 1) return 1;
  return Math.min(Math.max(n, 1), count);
}

/**
 * A summary as the build stored it: a sentence or two, or the bullet list a
 * guide opens its aims with (one "• " line each).
 */
export function summaryParts(summary: string | null): { bullets: string[] } | { text: string } | null {
  if (!summary?.trim()) return null;
  const lines = summary.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1 && lines.every((l) => l.startsWith("•"))) return { bullets: lines.map((l) => l.replace(/^•\s*/, "")) };
  return { text: lines.join(" ") };
}

/** One line for a card: bullets run together with middots. */
export function summaryLine(summary: string | null): string | null {
  const parts = summaryParts(summary);
  if (!parts) return null;
  return "bullets" in parts ? parts.bullets.join(" · ") : parts.text;
}
