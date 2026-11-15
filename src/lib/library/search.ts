import type { MaterialKind, SeriesKey } from "./catalogue";
import type { SearchEntry } from "./types";

/**
 * Library search.
 *
 * Pure, and small enough to run in the browser on every keystroke: the whole
 * index is a few hundred kilobytes of text. Every word typed must appear
 * (a word may be the start of a longer one, so "breath" finds "breathing");
 * numbers must match exactly, so "5" finds Worksheet 5 and not "50 minutes".
 *
 * A match in a resource's title counts for more than one in its guides, and
 * the words typed together as a phrase count for more than the same words
 * scattered, so the most relevant resource comes first.
 */

export type Segment = { text: string; hit: boolean };

export type Hit = {
  materialId: string | null;
  at: string | null;
  label: string | null;
  snippet: Segment[] | null;
  score: number;
};

export type CollectionResult = { slug: string; score: number; hits: Hit[] };

export type SearchFilters = { series?: SeriesKey | null; kind?: MaterialKind | null };

export type CollectionLookup = Map<
  string,
  { series: SeriesKey; materials: { id: string; kind: MaterialKind }[] }
>;

export type PreparedEntry = SearchEntry & { words: string[]; norm: string };

const STOP_WORDS = new Set(["a", "an", "and", "the", "of", "to", "in", "for", "on", "is", "my", "your", "with", "at", "or"]);

/** Units a resource number can be typed with: "ws5", "act 2". */
const UNIT_ALIASES: Record<string, string> = { ws: "worksheet", worksheet: "worksheet", act: "act", rel: "relationship" };

export function normalise(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The words a query must match, with "ws5" read as "worksheet 5". */
export function queryTokens(query: string): string[] {
  const out: string[] = [];
  for (const raw of normalise(query).split(" ")) {
    if (!raw) continue;
    const unit = raw.match(/^([a-z]+?)(\d+)$/);
    if (unit && UNIT_ALIASES[unit[1]]) {
      out.push(UNIT_ALIASES[unit[1]], unit[2]);
    } else if (UNIT_ALIASES[raw] && raw === "ws") {
      out.push("worksheet");
    } else {
      out.push(raw);
    }
  }
  const unique = [...new Set(out)];
  const meaningful = unique.filter((t) => !STOP_WORDS.has(t) && (t.length > 1 || /\d/.test(t)));
  return meaningful.length ? meaningful : unique;
}

export function prepareIndex(entries: SearchEntry[]): PreparedEntry[] {
  return entries.map((e) => {
    const norm = normalise(e.text);
    return { ...e, norm, words: norm ? norm.split(" ") : [] };
  });
}

const isNumber = (t: string) => /^\d+$/.test(t);

/** 3 for a whole word, 2 for the start of a word, 0 for no match. */
function tokenScore(token: string, words: string[]): number {
  let best = 0;
  for (const w of words) {
    if (w === token) return 3;
    if (!isNumber(token) && w.startsWith(token)) best = 2;
  }
  return best;
}

function weightOf(e: SearchEntry): number {
  if (e.m === null) return 10;
  if (e.at === null) return 5;
  return 1;
}

export function scoreEntry(entry: PreparedEntry, tokens: string[], phrase: string): number {
  if (!tokens.length) return 0;
  let sum = 0;
  for (const t of tokens) {
    const s = tokenScore(t, entry.words);
    if (!s) return 0;
    sum += s;
  }
  if (tokens.length > 1 && phrase && ` ${entry.norm} `.includes(` ${phrase}`)) sum += 4;
  return sum * weightOf(entry);
}

export function search(
  index: PreparedEntry[],
  query: string,
  collections: CollectionLookup,
  filters: SearchFilters = {},
  limit = 40
): CollectionResult[] {
  const tokens = queryTokens(query);
  if (!tokens.length) return [];
  const phrase = normalise(query);

  const byCollection = new Map<string, Hit[]>();
  for (const entry of index) {
    const info = collections.get(entry.c);
    if (!info) continue;
    if (filters.series && info.series !== filters.series) continue;
    if (filters.kind) {
      if (entry.m === null) continue;
      if (info.materials.find((m) => m.id === entry.m)?.kind !== filters.kind) continue;
    }
    const score = scoreEntry(entry, tokens, phrase);
    if (!score) continue;
    const hits = byCollection.get(entry.c) ?? [];
    hits.push({
      materialId: entry.m,
      at: entry.at,
      label: entry.label,
      snippet: entry.at === null ? null : snippet(entry.text, tokens),
      score,
    });
    byCollection.set(entry.c, hits);
  }

  const results: CollectionResult[] = [];
  for (const [slug, hits] of byCollection) {
    hits.sort((a, b) => b.score - a.score);
    // Best hit per material, so one long guide cannot crowd out the rest.
    const seen = new Set<string>();
    const best: Hit[] = [];
    for (const h of hits) {
      const key = `${h.materialId ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      best.push(h);
    }
    const others = hits.slice(1).reduce((n, h) => n + h.score, 0);
    results.push({ slug, score: hits[0].score + Math.min(others * 0.15, hits[0].score), hits: best.slice(0, 4) });
  }

  return results.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug)).slice(0, limit);
}

/** Where a word starting with `token` begins in `lower`, from `from`. */
function findWordStart(lower: string, token: string, from = 0): number {
  let i = lower.indexOf(token, from);
  while (i !== -1) {
    const before = i === 0 ? "" : lower[i - 1];
    if (!before || !/[a-z0-9]/.test(before)) {
      if (!isNumber(token)) return i;
      const after = lower[i + token.length] ?? "";
      if (!/[0-9]/.test(after)) return i;
    }
    i = lower.indexOf(token, i + 1);
  }
  return -1;
}

/**
 * A short passage around the first match, split into plain and matched
 * pieces so it can be rendered without any HTML.
 */
export function snippet(text: string, tokens: string[], radius = 70): Segment[] {
  const flat = text.replace(/\s+/g, " ").trim();
  const lower = flat.toLowerCase().replace(/[’`]/g, "'");
  const firsts = tokens.map((t) => findWordStart(lower, t)).filter((i) => i >= 0);
  const first = firsts.length ? Math.min(...firsts) : 0;

  let start = Math.max(0, first - radius);
  if (start > 0) {
    const space = flat.indexOf(" ", start);
    start = space !== -1 && space < first ? space + 1 : start;
  }
  let end = Math.min(flat.length, first + radius * 2);
  if (end < flat.length) {
    const space = flat.lastIndexOf(" ", end);
    end = space > first ? space : end;
  }
  const window = flat.slice(start, end);
  const lowerWindow = lower.slice(start, end);

  const ranges: [number, number][] = [];
  for (const t of tokens) {
    let i = findWordStart(lowerWindow, t);
    while (i !== -1) {
      let j = i + t.length;
      while (j < lowerWindow.length && /[a-z0-9]/.test(lowerWindow[j])) j++;
      ranges.push([i, j]);
      i = findWordStart(lowerWindow, t, j);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);

  const segments: Segment[] = [];
  if (start > 0) segments.push({ text: "…", hit: false });
  let pos = 0;
  for (const [a, b] of ranges) {
    if (a < pos) continue;
    if (a > pos) segments.push({ text: window.slice(pos, a), hit: false });
    segments.push({ text: window.slice(a, b), hit: true });
    pos = b;
  }
  if (pos < window.length) segments.push({ text: window.slice(pos), hit: false });
  if (end < flat.length) segments.push({ text: "…", hit: false });
  return segments;
}
