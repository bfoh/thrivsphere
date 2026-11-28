/**
 * Blog rules: who may approve a post, what each status allows, and the checks
 * a reviewer sees before deciding.
 *
 * Pure: no database, no framework, nothing server-only, so the rules can be
 * tested on their own and shown in the editor without a round trip.
 *
 * The rule that matters most: nothing reaches the website until a reviewer
 * has approved that exact version. Any change after approval clears the
 * approval, and a post that is already live stays as it was approved until
 * the new version is approved too.
 */

import { signposts } from "../data/site";

export type BlogStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "scheduled"
  | "published"
  | "archived";

export type BlogLength = "short" | "standard" | "long";

/** A source a post relies on, listed under it on the website. */
export type BlogSource = {
  title: string;
  publisher: string | null;
  /** The link, when the source is on the web. A book or journal reference may have none. */
  url: string | null;
  /** When it was read, as YYYY-MM-DD. */
  accessed: string | null;
};

/** What the author asked for. Kept for the AI assistant and for the record. */
export type BlogBrief = {
  topic: string;
  audience: string;
  takeaway: string;
  length: BlogLength;
  notes: string;
};

/** Everything that appears on the website, and so everything a reviewer approves. */
export type BlogContent = {
  title: string;
  category: string;
  excerpt: string;
  metaDescription: string | null;
  body: string;
  sources: BlogSource[];
  coverImage: string | null;
  coverAlt: string | null;
};

export const STATUS_LABEL: Record<BlogStatus, string> = {
  draft: "Draft",
  in_review: "Waiting for review",
  changes_requested: "Changes requested",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

export const BLOG_CATEGORIES = [
  "Emotional Wellbeing",
  "Coping Skills",
  "Resilience",
  "Mindfulness",
  "Healthy Relationships",
  "Recovery",
  "Workplace Wellbeing",
  "Self-care",
] as const;

/** Who a post is for: ThriveSphere's services, plus anyone. */
export const AUDIENCES = [
  { value: "general", label: "Anyone looking after their wellbeing" },
  { value: "needs-review", label: "People considering support (Wellbeing Needs Review)" },
  { value: "emotional-wellbeing", label: "Emotional Wellbeing Support" },
  { value: "coping-skills", label: "Psychoeducation and Coping Skills" },
  { value: "resilience", label: "Resilience and Personal Development" },
  { value: "workplace", label: "Workplace Wellbeing" },
] as const;

export const LENGTHS: { value: BlogLength; label: string; words: [number, number] }[] = [
  { value: "short", label: "Short read (about 3 minutes)", words: [450, 700] },
  { value: "standard", label: "Standard read (about 5 minutes)", words: [800, 1100] },
  { value: "long", label: "Long read (about 8 minutes)", words: [1300, 1700] },
];

/** The four things a reviewer confirms before approving. */
export const REVIEW_CHECKS = [
  { key: "read", label: "I have read the whole post as it will appear on the website" },
  { key: "facts", label: "Facts and figures match the sources listed" },
  { key: "safe", label: "It is safe and suitable for someone who may be struggling" },
  { key: "private", label: "Nothing in it could identify a client" },
] as const;

export type ReviewCheckKey = (typeof REVIEW_CHECKS)[number]["key"];

/**
 * Sites we expect sources to come from. A source elsewhere isn't refused, but
 * the reviewer is asked to check it. The AI researcher is limited to these.
 */
export const TRUSTED_DOMAINS = [
  "nhs.uk",
  "nice.org.uk",
  "gov.uk",
  "mind.org.uk",
  "mentalhealth.org.uk",
  "samaritans.org",
  "rethink.org",
  "rcpsych.ac.uk",
  "bacp.co.uk",
  "refuge.org.uk",
  "womensaid.org.uk",
  "nationaldahelpline.org.uk",
  "youngminds.org.uk",
  "acas.org.uk",
  "cipd.org",
  "who.int",
  "ncbi.nlm.nih.gov",
  "thrivsphere.org",
];

export const LIMITS = {
  title: 120,
  /** About what search engines show of a title. A guide, not a limit. */
  titleSearch: 65,
  excerpt: 300,
  /** About what search engines show of a description. A guide; the limit is `metaDescriptionMax`. */
  metaDescription: 155,
  metaDescriptionMax: 200,
  /** Characters. About 15,000 words, far beyond the longest read. */
  body: 100_000,
  sources: 50,
  coverAlt: 250,
  comment: 2000,
  minWordsForReview: 150,
};

// ---------------------------------------------------------------------------
// Approval

export type ReviewerActor = {
  userId: string;
  role: "client" | "practitioner" | "supervisor" | "admin" | "founder";
  status: "active" | "suspended" | "deleted";
};

export type Decision = { allowed: true } | { allowed: false; reason: string };

/**
 * Whether someone may approve (or send back) this version of a post.
 *
 * The founder may approve anything, her own posts included (owner's decision,
 * 21 November 2026). A colleague she has named as a blog reviewer may approve
 * other people's posts, but never one she wrote or a version she made.
 */
export function canReview(o: {
  actor: ReviewerActor;
  isReviewer: boolean;
  authorId: string | null;
  versionCreatedBy: string | null;
}): Decision {
  if (o.actor.status !== "active") return { allowed: false, reason: "Your account isn't active." };
  if (o.actor.role === "founder") return { allowed: true };
  if (o.actor.role === "client" || !o.isReviewer) {
    return { allowed: false, reason: "Only the founder, or a colleague she has named as a blog reviewer, can approve posts." };
  }
  if (o.authorId === o.actor.userId) {
    return { allowed: false, reason: "You wrote this post, so someone else needs to review it." };
  }
  if (o.versionCreatedBy === o.actor.userId) {
    return { allowed: false, reason: "You made the latest changes, so someone else needs to review this version." };
  }
  return { allowed: true };
}

export function checklistComplete(checks: Partial<Record<string, boolean>>): boolean {
  return REVIEW_CHECKS.every((c) => checks[c.key] === true);
}

// ---------------------------------------------------------------------------
// What each status allows

export type PostState = {
  status: BlogStatus;
  currentVersionId: string | null;
  approvedVersionId: string | null;
  publishedVersionId: string | null;
};

export const isLive = (p: PostState) => p.publishedVersionId !== null;

/** The current version has been approved and nothing has changed since. */
export const approvalStands = (p: PostState) =>
  p.approvedVersionId !== null && p.approvedVersionId === p.currentVersionId;

export const canSubmit = (p: PostState) => p.status === "draft" || p.status === "changes_requested";

/** Waiting for a decision, or live without one (posts that were on the site before reviews began). */
export function awaitingDecision(p: PostState, currentReviewed: boolean): boolean {
  if (p.status === "in_review") return true;
  return p.status === "published" && p.currentVersionId === p.publishedVersionId && !currentReviewed;
}

export const canWithdraw = (p: PostState) => p.status === "in_review";

export const canPublish = (p: PostState) =>
  (p.status === "approved" || p.status === "scheduled") && approvalStands(p);

export const canSchedule = canPublish;

export const canUnpublish = (p: PostState) => isLive(p);

export const canArchive = (p: PostState) => !isLive(p) && p.status !== "archived";

export const canRestore = (p: PostState) => p.status === "archived";

/**
 * What saving a changed version does to a post: back to draft, approval and
 * any schedule cleared. A live post stays live, as it was approved.
 */
export function afterEdit(): Pick<PostState, "status" | "approvedVersionId"> & { scheduledFor: null } {
  return { status: "draft", approvedVersionId: null, scheduledFor: null };
}

/** The earliest a post can be scheduled for: the hourly job picks it up after this. */
export function scheduleProblem(when: Date, now: Date): string | null {
  if (Number.isNaN(when.getTime())) return "Choose a date and time.";
  if (when.getTime() <= now.getTime() + 5 * 60_000) return "Choose a time at least a few minutes from now, or publish now instead.";
  if (when.getTime() > now.getTime() + 366 * 24 * 3600_000) return "Choose a time within the next year.";
  return null;
}

// ---------------------------------------------------------------------------
// Text helpers

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Addresses under /blog that are taken by the feed and the photo route. */
export const RESERVED_SLUGS = ["images", "rss", "feed"];

export const isValidSlug = (s: string) =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 80 && !RESERVED_SLUGS.includes(s);

/** Cover photos: JPEG, PNG or WebP, up to 4 MB, stored under a generated name. */
export const COVER_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const COVER_MAX_BYTES = 4 * 1024 * 1024;
export const isCoverName = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/.test(s);

/** The first free slug: `base`, then `base-2`, `base-3`… */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = !base ? "post" : RESERVED_SLUGS.includes(base) ? `${base}-post` : base;
  if (!used.has(root)) return root;
  for (let n = 2; ; n++) {
    const candidate = `${root}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

export function wordCount(markdown: string): number {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|-]/g, " ");
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** "5 min read", at about 200 words a minute. */
export function readingTime(markdown: string): string {
  return `${Math.max(1, Math.round(wordCount(markdown) / 200))} min read`;
}

/** About how long a summary made from the opening of a post runs. */
const AUTO_EXCERPT = 220;

/**
 * A summary for a post whose author left the summary empty: its first
 * paragraph of ordinary text, without formatting, cut at a sentence (or,
 * failing that, a word) near `AUTO_EXCERPT` characters.
 */
export function autoExcerpt(markdown: string): string {
  const first = paragraphs(markdown).find((p) => !/^(?:#{1,6}\s|>|[-*+]\s|\d+[.)]\s|```|!\[|\|)/.test(p));
  if (!first) return "";
  const text = first
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__|\*|_|`|~~)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= AUTO_EXCERPT) return text;
  const head = text.slice(0, AUTO_EXCERPT);
  const sentence = Math.max(head.lastIndexOf(". "), head.lastIndexOf("? "), head.lastIndexOf("! "));
  if (sentence >= 80) return head.slice(0, sentence + 1);
  const space = head.lastIndexOf(" ");
  return `${head.slice(0, space > 80 ? space : AUTO_EXCERPT).replace(/[\s,;:.-]+$/, "")}…`;
}

const BULLET = /^(?:[•·▪◦●○■□➢➤►✓✔]\s*|[-*+]\s+|o\t)(.+)$/;
const NUMBERED = /^(\d{1,3})[.)]\s+(.+)$/;

/**
 * Text pasted from Word or Google Docs arrives with one line break between
 * paragraphs, which Markdown reads as a single paragraph, and with "•" for
 * bullet points. This spaces the paragraphs and turns bullets into list
 * items. Returns null when there's nothing to change: one line, or text that
 * already has empty lines between its paragraphs.
 */
export function tidyPastedText(text: string): string | null {
  const t = text.replace(/\r\n?/g, "\n").replace(/ /g, " ");
  if (!t.trim().includes("\n") || /\n[ \t]*\n/.test(t.trim())) return null;
  let out = "";
  let prevList = false;
  for (const raw of t.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = line.match(BULLET);
    const numbered = bullet ? null : line.match(NUMBERED);
    const md = bullet ? `- ${bullet[1].trim()}` : numbered ? `${numbered[1]}. ${numbered[2].trim()}` : line;
    const isList = !!(bullet || numbered);
    if (out) out += isList && prevList ? "\n" : "\n\n";
    out += md;
    prevList = isList;
  }
  return out === text ? null : out;
}

/** Paragraphs, split on blank lines, for the reviewer's comparison. */
export function paragraphs(markdown: string): string[] {
  return markdown
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export type DiffPart = { kind: "same" | "added" | "removed"; text: string };

/** Paragraph-level comparison of two bodies: what changed since the last review. */
export function diffParagraphs(before: string, after: string): DiffPart[] {
  const a = paragraphs(before);
  const b = paragraphs(after);
  // Longest common subsequence, then walk it. Posts are short enough for O(n·m).
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: DiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: "same", text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ kind: "removed", text: a[i++] });
    } else {
      out.push({ kind: "added", text: b[j++] });
    }
  }
  while (i < a.length) out.push({ kind: "removed", text: a[i++] });
  while (j < b.length) out.push({ kind: "added", text: b[j++] });
  return out;
}

/** Fields that changed between two versions, other than the body. */
export function changedFields(before: BlogContent, after: BlogContent): string[] {
  const names: [keyof BlogContent, string][] = [
    ["title", "Title"],
    ["category", "Category"],
    ["excerpt", "Summary"],
    ["metaDescription", "Search description"],
    ["sources", "Sources"],
    ["coverImage", "Cover photo"],
    ["coverAlt", "Cover photo description"],
  ];
  return names
    .filter(([k]) => JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null))
    .map(([, label]) => label);
}

// ---------------------------------------------------------------------------
// Sources

export function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isTrustedHost(host: string): boolean {
  return TRUSTED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

/** A web address as typed, made into a link: `www.` gains `https://`, trailing punctuation goes. Null if it isn't one. */
function webAddress(raw: string): string | null {
  let url = /^www\./i.test(raw) ? `https://${raw}` : raw;
  url = url.replace(/[.,;:!?'"]+$/, "");
  // A closing bracket belongs to the address only if it opened one, as Wikipedia's do.
  while (/[)\]]$/.test(url) && (url.match(/[([]/g)?.length ?? 0) < (url.match(/[)\]]/g)?.length ?? 0)) {
    url = url.slice(0, -1).replace(/[.,;:!?'"]+$/, "");
  }
  return hostOf(url) ? url : null;
}

const ADDRESS = /(?:https?:\/\/|www\.)[^\s<>"]+/i;

/**
 * One line of the sources box. Either the layout the editor suggests,
 * `Title | Publisher | https://… | date read`, or a reference written the way
 * people write them (Harvard, APA, a bare link, a book with no link at all).
 * Only a real http(s) address ever becomes a link.
 */
function parseSourceLine(line: string): BlogSource {
  const parts = line.split("|").map((p) => p.trim());
  const urlAt = parts.findIndex((p) => /^(?:https?:\/\/|www\.)\S+$/i.test(p) && webAddress(p));
  if (parts.length > 1 && urlAt >= 1 && parts[0]) {
    const next = parts[urlAt + 1] ?? "";
    return {
      title: parts[0].slice(0, 500),
      publisher: urlAt >= 2 ? parts[1].slice(0, 200) || null : null,
      url: webAddress(parts[urlAt]),
      accessed: /^\d{4}-\d{2}-\d{2}$/.test(next) ? next : null,
    };
  }

  const found = line.match(ADDRESS);
  const url = found ? webAddress(found[0]) : null;
  let title = url && found ? line.replace(found[0], " ") : line;
  title = title
    .replace(/\b(?:available (?:at|from|online)|retrieved from|accessed via)\s*:?/gi, " ")
    .replace(/\[\s*online\s*\]/gi, " ")
    .replace(/\(\s*\)|\[\s*\]/g, " ")
    .replace(/\s+([.,;:)])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s,;:]+$/, "")
    .trim();
  return { title: (title || hostOf(url ?? "") || line).slice(0, 500), publisher: null, url, accessed: null };
}

/** The sources box: one source per line, in whatever form it was written. */
export function parseSources(text: string): { ok: true; sources: BlogSource[] } | { ok: false; message: string } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > LIMITS.sources) {
    return { ok: false, message: `There are ${lines.length} sources; list at most ${LIMITS.sources}, one per line.` };
  }
  return { ok: true, sources: lines.map(parseSourceLine) };
}

/** Back into the sources box, in a form `parseSources` reads back the same. */
export function formatSources(sources: BlogSource[]): string {
  return sources
    .map((s) => [s.title, s.publisher, s.url, s.url ? s.accessed : null].filter((p): p is string => !!p).join(" | "))
    .join("\n");
}

// ---------------------------------------------------------------------------
// Checks shown to the reviewer. None of these block approval; they point at
// things a person should look at.

export type Finding = { level: "warning" | "note"; message: string };

const PHRASES: { pattern: RegExp; message: string }[] = [
  {
    pattern: /\bsuicid|\bself[- ]harm|\boverdos|\bkill (?:myself|yourself|themselves)/i,
    message:
      "Mentions suicide or self-harm. Check it follows Samaritans' guidance for writing about suicide: no methods or details, and help routes included.",
  },
  {
    pattern: /\bcure[sd]?\b|\bguarantee|\bproven to\b|\b100% (?:effective|success)/i,
    message: "Promises an outcome (\"cure\", \"guarantee\", \"proven to\"). ThriveSphere doesn't promise results.",
  },
  {
    pattern: /\bdiagnos|\bdisorder\b/i,
    message: "Mentions diagnosis or disorders. ThriveSphere is a non-clinical service: check the post doesn't diagnose or suggest it can.",
  },
  {
    pattern: /\bmedication|\bantidepressant|\bprescri|\bdosage\b|\bsertraline|\bfluoxetine|\bcitalopram/i,
    message: "Mentions medication. Check it doesn't give advice about medicines, and points to a GP or pharmacist instead.",
  },
  {
    pattern: /\b(?:one of )?(?:my|our) clients?\b|\ba client (?:of mine|told me|said)/i,
    message: "Seems to describe a client. Make sure no one could be identified, and that any example is invented and says so.",
  },
];

/** Helpline numbers the site already lists, which are fine to include. */
const KNOWN_NUMBERS = new Set(
  ["999", "111", ...signposts.map((s) => s.phone ?? "")].filter(Boolean).map((n) => n.replace(/\s+/g, ""))
);

export function contentFindings(c: BlogContent): Finding[] {
  const out: Finding[] = [];
  const words = wordCount(c.body);

  if (!c.title.trim()) out.push({ level: "warning", message: "There's no title." });
  else if (c.title.length > LIMITS.titleSearch)
    out.push({ level: "note", message: `The title is ${c.title.length} characters; search engines show about ${LIMITS.titleSearch}.` });
  if (!c.excerpt.trim()) out.push({ level: "warning", message: "There's no summary for the blog page." });
  if ((c.metaDescription ?? c.excerpt).length > LIMITS.metaDescription)
    out.push({ level: "note", message: `The search description is over ${LIMITS.metaDescription} characters, so search engines will cut it short.` });
  if (words < LIMITS.minWordsForReview) out.push({ level: "warning", message: `The post is only ${words} words long.` });
  if (c.coverImage && !c.coverAlt?.trim())
    out.push({ level: "warning", message: "The cover photo has no description for people using screen readers." });

  for (const { pattern, message } of PHRASES) {
    if (pattern.test(c.body) || pattern.test(c.title)) out.push({ level: "warning", message });
  }

  // Links in the body that aren't listed as sources.
  const listed = new Set(c.sources.flatMap((s) => (s.url ? [s.url.replace(/\/+$/, "")] : [])));
  const links = [...c.body.matchAll(/\]\((https?:\/\/[^)\s]+)/gi)].map((m) => m[1]);
  for (const url of new Set(links)) {
    const host = hostOf(url);
    if (host === "thrivsphere.org") continue;
    if (!listed.has(url.replace(/\/+$/, ""))) out.push({ level: "note", message: `The link to ${host ?? url} isn't in the sources list.` });
  }

  for (const s of c.sources) {
    const host = s.url ? hostOf(s.url) : null;
    if (host && !isTrustedHost(host))
      out.push({ level: "note", message: `${host} isn't one of the usual trusted sources. Check it's reliable.` });
  }
  const unlinked = c.sources.filter((s) => !s.url).length;
  if (unlinked)
    out.push({ level: "note", message: `${unlinked === 1 ? "One source has" : `${unlinked} sources have`} no web address, so readers can't click through to check ${unlinked === 1 ? "it" : "them"}.` });

  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(c.body))
    out.push({ level: "warning", message: "Contains an email address. Check it isn't personal." });
  const numbers = [...c.body.matchAll(/(?:\+44\s?|\b0)\d[\d\s]{8,12}\d\b/g)].map((m) => m[0].replace(/\s+/g, ""));
  if (numbers.some((n) => !KNOWN_NUMBERS.has(n)))
    out.push({ level: "warning", message: "Contains a phone number that isn't one of the helplines the site lists. Check it." });

  if (c.sources.length === 0 && /\b\d+(?:\.\d+)?\s?(?:%|per ?cent|in \d+)\b/i.test(c.body))
    out.push({ level: "warning", message: "Quotes figures but lists no sources." });

  return out;
}

/** What must be in place before a post can go for review. */
export function reviewProblems(c: BlogContent): string[] {
  const p: string[] = [];
  if (!c.title.trim()) p.push("Add a title.");
  if (!c.excerpt.trim()) p.push("Add a short summary for the blog page.");
  if (!c.category.trim()) p.push("Choose a category.");
  if (wordCount(c.body) < LIMITS.minWordsForReview) p.push(`Write at least ${LIMITS.minWordsForReview} words.`);
  if (c.coverImage && !c.coverAlt?.trim()) p.push("Describe the cover photo for people using screen readers.");
  return p;
}

// ---------------------------------------------------------------------------
// Forms

/**
 * A form field, trimmed, with line breaks as one character each. Browsers send
 * a line break in a text box as two (CR LF), so without this a summary that
 * fits the box is refused for being one character over.
 */
const field = (input: Record<string, unknown>, name: string) => {
  const v = input[name];
  return typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim() : "";
};

const n = (x: number) => x.toLocaleString("en-GB");

export function parseContent(
  input: Record<string, unknown>,
  keep: { coverImage: string | null } = { coverImage: null }
): { ok: true; content: BlogContent } | { ok: false; message: string } {
  const title = field(input, "title");
  const category = field(input, "category");
  const body = field(input, "body");
  // Left empty, the summary is the opening of the post, so there's one less thing to write.
  const excerpt = field(input, "excerpt") || autoExcerpt(body);
  const metaDescription = field(input, "metaDescription") || null;
  const coverAlt = field(input, "coverAlt") || null;
  const cover = "coverImage" in input ? field(input, "coverImage") || null : keep.coverImage;
  if (cover && !isCoverName(cover)) return { ok: false, message: "That cover photo can't be used. Upload it again." };

  if (!title) return { ok: false, message: "Add a title." };
  if (title.length > LIMITS.title)
    return { ok: false, message: `The title is ${title.length} characters. Shorten it to ${LIMITS.title} or fewer.` };
  if (category && !(BLOG_CATEGORIES as readonly string[]).includes(category)) return { ok: false, message: "Choose a category from the list." };
  if (excerpt.length > LIMITS.excerpt)
    return { ok: false, message: `The summary is ${excerpt.length} characters. Shorten it to ${LIMITS.excerpt} or fewer, or leave it empty to use the opening of the post.` };
  if (metaDescription && metaDescription.length > LIMITS.metaDescriptionMax)
    return { ok: false, message: `The search engine description is ${metaDescription.length} characters. Shorten it to ${LIMITS.metaDescriptionMax} or fewer, or leave it empty to use the summary.` };
  if (body.length > LIMITS.body)
    return { ok: false, message: `The post is ${n(body.length)} characters, more than the ${n(LIMITS.body)} a post can hold. Split it into two posts.` };
  if (coverAlt && coverAlt.length > LIMITS.coverAlt)
    return { ok: false, message: `The photo description is ${coverAlt.length} characters. Shorten it to ${LIMITS.coverAlt} or fewer.` };

  const sources = parseSources(field(input, "sources"));
  if (!sources.ok) return sources;

  return {
    ok: true,
    content: {
      title,
      category: category || BLOG_CATEGORIES[0],
      excerpt,
      metaDescription,
      body,
      sources: sources.sources,
      coverImage: cover,
      coverAlt: cover ? coverAlt : null,
    },
  };
}

export function parseBrief(input: Record<string, unknown>): { ok: true; brief: BlogBrief } | { ok: false; message: string } {
  const topic = field(input, "topic");
  const audience = field(input, "audience") || "general";
  const takeaway = field(input, "takeaway");
  const length = (field(input, "length") || "standard") as BlogLength;
  const notes = field(input, "notes");
  if (!topic) return { ok: false, message: "Say what the post is about." };
  if (topic.length > 200) return { ok: false, message: "Keep the topic under 200 characters." };
  if (!AUDIENCES.some((a) => a.value === audience)) return { ok: false, message: "Choose who the post is for." };
  if (takeaway.length > 300) return { ok: false, message: "Keep the main message under 300 characters." };
  if (!LENGTHS.some((l) => l.value === length)) return { ok: false, message: "Choose a length." };
  if (notes.length > 1500) return { ok: false, message: "Keep the notes under 1,500 characters." };
  return { ok: true, brief: { topic, audience, takeaway, length, notes } };
}

/** "12 June 2026", in UK time. */
export function displayDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "long", year: "numeric" });
}
