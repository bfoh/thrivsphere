/**
 * ThriveSphere's colours, in one place.
 *
 * The website's CSS (`:root` in src/app/globals.css) and these values must
 * agree; brand-tokens.test.ts checks it. Code that can't read CSS variables
 * (social images, emails, the AI's brand prompt) uses these.
 */

export const BRAND_COLOURS = {
  teal: "#4fa8a8",
  tealDeep: "#3d8a8a",
  sage: "#a8c3a0",
  sageSoft: "#c7dac1",
  gold: "#d4af37",
  goldLight: "#e0c25a",
  warmWhite: "#faf9f6",
  navy: "#1f3a5f",
  navySoft: "#38537a",
  blush: "#e8c8d3",
  ink: "#2b3a4d",
  white: "#ffffff",
} as const;

export type BrandColour = keyof typeof BRAND_COLOURS;

/** The CSS variable each colour is published as on the website. */
export const CSS_VARIABLE: Partial<Record<BrandColour, string>> = {
  teal: "--teal",
  tealDeep: "--teal-deep",
  sage: "--sage",
  sageSoft: "--sage-soft",
  gold: "--gold",
  goldLight: "--gold-light",
  warmWhite: "--warm-white",
  navy: "--navy",
  navySoft: "--navy-soft",
  blush: "--blush",
  ink: "--ink",
};

/** Gradients, as [from, to] at 135°, matching --grad-* in globals.css. */
export const BRAND_GRADIENTS = {
  gold: ["#e0c25a", "#d4af37"],
  teal: ["#5cb6b6", "#4fa8a8"],
  sage: ["#b6cdaf", "#a8c3a0"],
} as const;

/**
 * The wordmark as the website draws it beside the emblem (src/components/icons.tsx).
 * Emails currently use slightly different teal and gold; the owner confirms
 * the canonical values in the Brand Kit.
 */
export const WORDMARK = { thrive: "#5a2d82", sphere: "#2f8a7e", wellbeing: "#b8860b" } as const;

export const BRAND_FONT = "Montserrat";

// ---------------------------------------------------------------------------
// Readable text (WCAG 2.2 contrast)

function channel(c: number) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Not a colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** Contrast between two colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** "any": body text (4.5:1 or more). "large": headings 24px+, or 19px+ bold (3:1). */
export type TextUse = "any" | "large" | "never";

export function textUse(text: string, background: string): TextUse {
  const r = contrastRatio(text, background);
  return r >= 4.5 ? "any" : r >= 3 ? "large" : "never";
}

/** Text-on-background pairs that templates may use, worked out from the palette. */
export function readablePairs(): { text: BrandColour; background: BrandColour; use: Exclude<TextUse, "never">; ratio: number }[] {
  const keys = Object.keys(BRAND_COLOURS) as BrandColour[];
  const out: { text: BrandColour; background: BrandColour; use: Exclude<TextUse, "never">; ratio: number }[] = [];
  for (const text of keys) {
    for (const background of keys) {
      if (text === background) continue;
      const use = textUse(BRAND_COLOURS[text], BRAND_COLOURS[background]);
      if (use !== "never") out.push({ text, background, use, ratio: Math.round(contrastRatio(BRAND_COLOURS[text], BRAND_COLOURS[background]) * 10) / 10 });
    }
  }
  return out;
}
