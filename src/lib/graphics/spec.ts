/**
 * Branded graphics: the sizes each channel wants, the colour themes, and the
 * templates with the fields each one takes.
 *
 * Pure, so the form, the renderer and the tests share one definition.
 * Platform sizes change; each has the date it was last checked.
 */

import { BRAND_COLOURS, textUse, type BrandColour } from "../brand-tokens";

export type SizeKey = "square" | "portrait" | "story" | "linkedin" | "facebook" | "gbp";

export const SIZES: Record<SizeKey, { label: string; width: number; height: number; checked: string }> = {
  square: { label: "Instagram / Facebook square (1080 × 1080)", width: 1080, height: 1080, checked: "2026-11-21" },
  portrait: { label: "Instagram portrait (1080 × 1350)", width: 1080, height: 1350, checked: "2026-11-21" },
  story: { label: "Story (1080 × 1920)", width: 1080, height: 1920, checked: "2026-11-21" },
  linkedin: { label: "LinkedIn post (1200 × 627)", width: 1200, height: 627, checked: "2026-11-21" },
  facebook: { label: "Facebook link / landscape (1200 × 630)", width: 1200, height: 630, checked: "2026-11-21" },
  gbp: { label: "Google Business Profile (1200 × 900)", width: 1200, height: 900, checked: "2026-11-21" },
};

export type ThemeKey = "navy" | "warm" | "sage" | "blush";

/** Text colours are only ever pairs that read at body size (WCAG 4.5:1). */
export const THEMES: Record<ThemeKey, { label: string; background: BrandColour; heading: BrandColour; body: BrandColour; eyebrow: BrandColour; accent: BrandColour; dark: boolean }> = {
  navy: { label: "Navy", background: "navy", heading: "white", body: "warmWhite", eyebrow: "goldLight", accent: "gold", dark: true },
  warm: { label: "Warm white", background: "warmWhite", heading: "navy", body: "ink", eyebrow: "navySoft", accent: "teal", dark: false },
  sage: { label: "Sage", background: "sageSoft", heading: "navy", body: "ink", eyebrow: "navySoft", accent: "tealDeep", dark: false },
  blush: { label: "Blush", background: "blush", heading: "navy", body: "ink", eyebrow: "navySoft", accent: "gold", dark: false },
};

export function themeColours(key: ThemeKey) {
  const t = THEMES[key];
  return {
    background: BRAND_COLOURS[t.background],
    heading: BRAND_COLOURS[t.heading],
    body: BRAND_COLOURS[t.body],
    eyebrow: BRAND_COLOURS[t.eyebrow],
    accent: BRAND_COLOURS[t.accent],
    dark: t.dark,
  };
}

/** Every text colour in every theme passes for body text. */
export const themesReadable = () =>
  (Object.keys(THEMES) as ThemeKey[]).every((k) => {
    const c = themeColours(k);
    return [c.heading, c.body, c.eyebrow].every((fg) => textUse(fg, c.background) === "any");
  });

// ---------------------------------------------------------------------------
// Templates

export type FieldKind = "text" | "textarea" | "photo" | "service" | "post" | "toggle";

export type TemplateField = { name: string; label: string; kind: FieldKind; max?: number; required?: boolean; hint?: string };

export type TemplateKey = "tip" | "slide" | "awareness" | "service" | "announcement" | "photo" | "blog";

export type TemplateDef = {
  key: TemplateKey;
  label: string;
  description: string;
  fields: TemplateField[];
  sizes: SizeKey[];
  themes: boolean;
};

const ALL: SizeKey[] = ["square", "portrait", "story", "linkedin", "facebook", "gbp"];

export const TEMPLATES: TemplateDef[] = [
  {
    key: "tip",
    label: "Tip card",
    description: "A practical tip or a line worth sharing, with a short explanation.",
    fields: [
      { name: "eyebrow", label: "Small heading (optional)", kind: "text", max: 40, hint: "e.g. Coping skills" },
      { name: "headline", label: "Main line", kind: "textarea", max: 110, required: true },
      { name: "body", label: "Explanation (optional)", kind: "textarea", max: 240 },
    ],
    sizes: ALL,
    themes: true,
  },
  {
    key: "slide",
    label: "Carousel slide",
    description: "One numbered slide of a step-by-step carousel. Make one per step, same theme.",
    fields: [
      { name: "number", label: "Step number", kind: "text", max: 2, required: true, hint: "e.g. 2" },
      { name: "total", label: "Number of steps", kind: "text", max: 2, required: true, hint: "e.g. 5" },
      { name: "headline", label: "Step heading", kind: "text", max: 70, required: true },
      { name: "body", label: "What to do", kind: "textarea", max: 260 },
    ],
    sizes: ["square", "portrait"],
    themes: true,
  },
  {
    key: "awareness",
    label: "Awareness day",
    description: "Marks a recognised day or week. Always carries the crisis line.",
    fields: [
      { name: "day", label: "Name of the day or week", kind: "text", max: 60, required: true },
      { name: "date", label: "Date as it should appear", kind: "text", max: 40, required: true, hint: "e.g. 10 October 2027" },
      { name: "message", label: "Message", kind: "textarea", max: 180, required: true },
    ],
    sizes: ALL,
    themes: true,
  },
  {
    key: "service",
    label: "Service spotlight",
    description: "Introduces one of ThriveSphere's services, in the website's own words.",
    fields: [
      { name: "service", label: "Service", kind: "service", required: true },
      { name: "line", label: "Line under the name (optional)", kind: "textarea", max: 160, hint: "Leave empty to use the website's summary" },
      { name: "cta", label: "Call to action", kind: "text", max: 50, hint: "e.g. Book at thrivsphere.org" },
    ],
    sizes: ALL,
    themes: true,
  },
  {
    key: "announcement",
    label: "Talk or workshop",
    description: "For employers and HR on LinkedIn: a talk, workshop or session with a date.",
    fields: [
      { name: "eyebrow", label: "Small heading", kind: "text", max: 40, hint: "e.g. Workplace wellbeing" },
      { name: "headline", label: "Title", kind: "textarea", max: 90, required: true },
      { name: "when", label: "When and where", kind: "text", max: 70, hint: "e.g. Thursday 4 March, 12:30, online" },
      { name: "details", label: "Details", kind: "textarea", max: 200 },
      { name: "cta", label: "Call to action", kind: "text", max: 50 },
    ],
    sizes: ALL,
    themes: true,
  },
  {
    key: "photo",
    label: "Photo with caption",
    description: "A photo from the library with a branded caption band.",
    fields: [
      { name: "photo", label: "Photo", kind: "photo", required: true },
      { name: "caption", label: "Caption", kind: "textarea", max: 120, required: true },
    ],
    sizes: ALL,
    themes: true,
  },
  {
    key: "blog",
    label: "Blog post",
    description: "Promotes a published blog post, with its cover photo if it has one.",
    fields: [{ name: "post", label: "Published post", kind: "post", required: true }],
    sizes: ALL,
    themes: true,
  },
];

export const templateByKey = (k: string) => TEMPLATES.find((t) => t.key === k) ?? null;

export type GraphicInput = { template: TemplateKey; size: SizeKey; theme: ThemeKey; values: Record<string, string> };

/** Check what the form sent. Text is trimmed and cut to each field's limit. */
export function parseGraphicInput(get: (name: string) => string): { ok: true; input: GraphicInput } | { ok: false; message: string } {
  const def = templateByKey(get("template"));
  if (!def) return { ok: false, message: "Choose a template." };
  const size = get("size") as SizeKey;
  if (!def.sizes.includes(size)) return { ok: false, message: "Choose a size this template supports." };
  const theme = (get("theme") || "navy") as ThemeKey;
  if (!THEMES[theme]) return { ok: false, message: "Choose a colour theme." };
  const values: Record<string, string> = {};
  for (const f of def.fields) {
    let v = get(f.name).replace(/\r\n/g, "\n").trim();
    if (f.max) v = v.slice(0, f.max);
    if (f.kind === "photo" && v && !/^[0-9a-f-]{36}$/.test(v)) v = "";
    if (f.kind === "post" && v && !/^[a-z0-9-]{1,80}$/.test(v)) v = "";
    if (f.required && !v) return { ok: false, message: `${f.label} is needed.` };
    if (v) values[f.name] = v;
  }
  return { ok: true, input: { template: def.key, size, theme, values } };
}

// ---------------------------------------------------------------------------
// Fitting text

/**
 * The largest font size, in steps of 2px, at which `text` fits a box,
 * estimating Montserrat's average character width. Conservative on purpose:
 * text that fits with room to spare beats text that runs off the edge.
 */
export function fitFontSize(text: string, o: { width: number; height: number; max: number; min: number; lineHeight?: number; charWidth?: number }): number {
  const lh = o.lineHeight ?? 1.2;
  const cw = o.charWidth ?? 0.58;
  const words = text.split(/\s+/).filter(Boolean);
  for (let size = o.max; size > o.min; size -= 2) {
    if (linesNeeded(words, Math.floor(o.width / (size * cw)), text) * size * lh <= o.height) return size;
  }
  return o.min;
}

function linesNeeded(words: string[], perLine: number, text: string): number {
  if (perLine < 1) return Infinity;
  let lines = 0;
  for (const paragraph of text.split("\n")) {
    let current = 0;
    lines++;
    for (const w of paragraph.split(/\s+/).filter(Boolean)) {
      const len = w.length;
      if (current === 0) current = len;
      else if (current + 1 + len <= perLine) current += 1 + len;
      else {
        lines++;
        current = len;
      }
      if (len > perLine) lines += Math.ceil(len / perLine) - 1;
    }
  }
  return words.length ? lines : 0;
}

/** Spacing and type scale from a 1080-wide design; short landscape sizes scale by height. */
export const scaleFor = (size: SizeKey) => Math.min(SIZES[size].width / 1080, SIZES[size].height / 700);

export const isLandscape = (size: SizeKey) => SIZES[size].width > SIZES[size].height;
