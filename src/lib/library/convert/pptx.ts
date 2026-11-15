import { attr, child, children, elements, num, parseXml, path, textOf, type XmlElement } from "./xml";
import { zipText, type ZipEntries } from "./zip";
import { fontStack } from "./doc-html";

/**
 * PowerPoint (.pptx): slide text, speaker notes, and a fallback renderer.
 *
 * Slides are normally drawn by macOS Quick Look, which renders the owner's
 * decks faithfully. Where Quick Look cannot open a deck, `renderSlideHtml`
 * draws each slide from its XML instead: backgrounds, rectangles, rounded
 * rectangles, ellipses, lines, text boxes, pictures and groups, with theme
 * colours and the theme's shadow styles. That covers everything the decks
 * use; anything else is reported in `warnings` so it is never lost quietly.
 */

const EMU_PER_PT = 12700;

export type SlideParagraph = { text: string; size: number };

export type DeckSlide = {
  /** `ppt/slides/slide3.xml` */
  part: string;
  root: XmlElement;
  rels: Map<string, { target: string; type: string }>;
  paragraphs: SlideParagraph[];
  /** The slide's largest line of text, which is its heading. */
  title: string | null;
  text: string;
  notes: string | null;
};

export type Deck = {
  /** Slide size in EMU. */
  width: number;
  height: number;
  slides: DeckSlide[];
  theme: Theme;
  masterOtherStyle: XmlElement | null;
  defaultTextStyle: XmlElement | null;
  zip: ZipEntries;
};

type Theme = {
  colors: Map<string, string>;
  fonts: { major: string | null; minor: string | null };
  effects: XmlElement[];
  lines: XmlElement[];
  clrMap: Map<string, string>;
};

/* -------------------------------------------------------------------- parts */

function resolvePart(from: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = from.split("/").slice(0, -1);
  for (const seg of target.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}

function relsFor(zip: ZipEntries, part: string) {
  const dir = part.split("/").slice(0, -1).join("/");
  const file = part.split("/").pop();
  const xml = zipText(zip, `${dir}/_rels/${file}.rels`);
  const out = new Map<string, { target: string; type: string }>();
  if (!xml) return out;
  for (const r of children(parseXml(xml), "Relationship")) {
    const id = attr(r, "Id");
    const target = attr(r, "Target");
    if (!id || !target) continue;
    const external = attr(r, "TargetMode") === "External";
    out.set(id, { target: external ? target : resolvePart(part, target), type: attr(r, "Type") ?? "" });
  }
  return out;
}

const relOfType = (rels: Map<string, { target: string; type: string }>, suffix: string) =>
  [...rels.values()].find((r) => r.type.endsWith(`/${suffix}`))?.target ?? null;

function readTheme(zip: ZipEntries, masterPart: string | null): Theme {
  const colors = new Map<string, string>();
  const clrMap = new Map<string, string>([
    ["bg1", "lt1"], ["tx1", "dk1"], ["bg2", "lt2"], ["tx2", "dk2"],
  ]);
  let fonts = { major: null as string | null, minor: null as string | null };
  let effects: XmlElement[] = [];
  let lines: XmlElement[] = [];
  const master = masterPart ? zipText(zip, masterPart) : null;
  if (masterPart && master) {
    const m = parseXml(master);
    const map = child(m, "p:clrMap");
    if (map) for (const [k, v] of Object.entries(map.attrs)) clrMap.set(k, v);
    const themePart = relOfType(relsFor(zip, masterPart), "theme");
    const themeXml = themePart ? zipText(zip, themePart) : null;
    if (themeXml) {
      const t = parseXml(themeXml);
      const el = child(t, "a:themeElements");
      for (const c of elements(child(el, "a:clrScheme"))) {
        const name = c.name.replace(/^a:/, "");
        const srgb = child(c, "a:srgbClr");
        const sys = child(c, "a:sysClr");
        const v = attr(srgb, "val") ?? attr(sys, "lastClr");
        if (v) colors.set(name, `#${v.toLowerCase()}`);
      }
      const fs = child(el, "a:fontScheme");
      fonts = {
        major: attr(path(fs, "a:majorFont", "a:latin"), "typeface") ?? null,
        minor: attr(path(fs, "a:minorFont", "a:latin"), "typeface") ?? null,
      };
      effects = children(path(el, "a:fmtScheme", "a:effectStyleLst"), "a:effectStyle");
      lines = children(path(el, "a:fmtScheme", "a:lnStyleLst"), "a:ln");
    }
  }
  return { colors, fonts, effects, lines, clrMap };
}

/* ------------------------------------------------------------------- colour */

type Rgba = { r: number; g: number; b: number; a: number };

function hexToRgb(hex: string): Rgba {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
}

function rgbToHsl({ r, g, b }: Rgba) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: h / 6, s, l };
}

function hslToRgb(h: number, s: number, l: number, a: number): Rgba {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255, a };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return { r: f(h + 1 / 3) * 255, g: f(h) * 255, b: f(h - 1 / 3) * 255, a };
}

const css = (c: Rgba) =>
  c.a >= 1
    ? `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`
    : `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${c.a.toFixed(3)})`;

/** A colour element (`a:srgbClr`, `a:schemeClr`, …) with its modifiers. */
function colorOf(el: XmlElement | null | undefined, theme: Theme, phClr?: Rgba): Rgba | null {
  if (!el) return null;
  let base: Rgba | null = null;
  const v = attr(el, "val");
  if (el.name === "a:srgbClr" && v && /^[0-9a-f]{6}$/i.test(v)) base = hexToRgb(`#${v}`);
  else if (el.name === "a:sysClr") base = hexToRgb(`#${attr(el, "lastClr") ?? "000000"}`);
  else if (el.name === "a:schemeClr" && v) {
    if (v === "phClr") base = phClr ?? null;
    else {
      const mapped = theme.clrMap.get(v) ?? v;
      const hex = theme.colors.get(mapped);
      if (hex) base = hexToRgb(hex);
    }
  } else if (el.name === "a:prstClr") base = v === "white" ? hexToRgb("#ffffff") : hexToRgb("#000000");
  if (!base) return null;

  let c = { ...base };
  for (const m of elements(el)) {
    const val = (num(m, "val") ?? 0) / 100000;
    if (m.name === "a:alpha") c.a = val;
    else if (m.name === "a:lumMod" || m.name === "a:lumOff") {
      const hsl = rgbToHsl(c);
      const l = m.name === "a:lumMod" ? hsl.l * val : hsl.l + val;
      c = hslToRgb(hsl.h, hsl.s, Math.min(1, Math.max(0, l)), c.a);
    } else if (m.name === "a:tint") {
      c = { r: c.r + (255 - c.r) * (1 - val), g: c.g + (255 - c.g) * (1 - val), b: c.b + (255 - c.b) * (1 - val), a: c.a };
    } else if (m.name === "a:shade") {
      c = { r: c.r * val, g: c.g * val, b: c.b * val, a: c.a };
    }
  }
  return c;
}

const COLOR_NAMES = ["a:srgbClr", "a:schemeClr", "a:sysClr", "a:prstClr"];
const colorChild = (el: XmlElement | null | undefined) => elements(el).find((c) => COLOR_NAMES.includes(c.name)) ?? null;

/* --------------------------------------------------------------------- read */

export function readDeck(zip: ZipEntries): Deck {
  const presPart = "ppt/presentation.xml";
  const pres = parseXml(zipText(zip, presPart) ?? "");
  const presRels = relsFor(zip, presPart);
  const size = child(pres, "p:sldSz");
  const ids = children(child(pres, "p:sldIdLst"), "p:sldId");

  const firstSlide = ids.length ? presRels.get(attr(ids[0], "r:id") ?? "")?.target : null;
  const layout = firstSlide ? relOfType(relsFor(zip, firstSlide), "slideLayout") : null;
  const masterPart = layout ? relOfType(relsFor(zip, layout), "slideMaster") : relOfType(presRels, "slideMaster");
  const theme = readTheme(zip, masterPart);
  const master = masterPart && zipText(zip, masterPart) ? parseXml(zipText(zip, masterPart)!) : null;

  const deck: Deck = {
    width: num(size, "cx") ?? 12192000,
    height: num(size, "cy") ?? 6858000,
    slides: [],
    theme,
    masterOtherStyle: path(master, "p:txStyles", "p:otherStyle"),
    defaultTextStyle: child(pres, "p:defaultTextStyle"),
    zip,
  };

  for (const id of ids) {
    const part = presRels.get(attr(id, "r:id") ?? "")?.target;
    const xml = part ? zipText(zip, part) : null;
    if (!part || !xml) continue;
    const root = parseXml(xml);
    const rels = relsFor(zip, part);
    const paragraphs = slideParagraphs(root, deck);
    const notesPart = relOfType(rels, "notesSlide");
    const notesXml = notesPart ? zipText(zip, notesPart) : null;
    const notes = notesXml ? notesText(parseXml(notesXml)) : null;
    deck.slides.push({
      part,
      root,
      rels,
      paragraphs,
      title: slideTitle(paragraphs, notes),
      text: paragraphs.map((p) => p.text).join("\n"),
      notes,
    });
  }
  return deck;
}

function shapesIn(tree: XmlElement | null): XmlElement[] {
  const out: XmlElement[] = [];
  for (const c of elements(tree)) {
    if (c.name === "p:grpSp") out.push(...shapesIn(c));
    else if (c.name === "mc:AlternateContent") out.push(...shapesIn(child(c, "mc:Fallback")));
    else out.push(c);
  }
  return out;
}

function paragraphText(p: XmlElement): string {
  let s = "";
  for (const c of elements(p)) {
    if (c.name === "a:r" || c.name === "a:fld") s += textOf(child(c, "a:t") ?? { name: "", attrs: {}, children: [] });
    else if (c.name === "a:br") s += "\n";
  }
  return s;
}

function slideParagraphs(root: XmlElement, deck: Deck): SlideParagraph[] {
  const out: SlideParagraph[] = [];
  const tree = path(root, "p:cSld", "p:spTree");
  for (const sp of shapesIn(tree)) {
    const bodies = sp.name === "p:graphicFrame" ? tableBodies(sp) : [child(sp, "p:txBody")];
    for (const body of bodies) {
      for (const p of children(body, "a:p")) {
        const text = paragraphText(p).replace(/[ \t]+/g, " ").trim();
        if (!text) continue;
        const sizes = children(p, "a:r").map((r) => num(child(r, "a:rPr"), "sz"));
        const def = num(path(p, "a:pPr", "a:defRPr"), "sz");
        const lvl = defaultSize(body, deck);
        const size = Math.max(...sizes.map((s) => s ?? def ?? lvl), def ?? lvl) / 100;
        out.push({ text, size });
      }
    }
  }
  return out;
}

function tableBodies(frame: XmlElement): (XmlElement | null)[] {
  const tbl = path(frame, "a:graphic", "a:graphicData", "a:tbl");
  return children(tbl, "a:tr").flatMap((tr) => children(tr, "a:tc").map((tc) => child(tc, "a:txBody")));
}

function defaultSize(body: XmlElement | null, deck: Deck): number {
  return (
    num(path(body, "a:lstStyle", "a:lvl1pPr", "a:defRPr"), "sz") ??
    num(path(deck.masterOtherStyle, "a:lvl1pPr", "a:defRPr"), "sz") ??
    num(path(deck.defaultTextStyle, "a:lvl1pPr", "a:defRPr"), "sz") ??
    1800
  );
}

const SKIP_TITLE = /^(thrive\s?sphere\b|©|copyright\b|slide \d+|\d+\s*(\/|of)\s*\d+$)/i;

/**
 * A slide's heading. Speaker notes that open "SLIDE 3: Title" name it
 * outright; otherwise it is the largest short line, leaving out the brand,
 * copyright and page-number lines every slide carries.
 */
export function slideTitle(paragraphs: SlideParagraph[], notes: string | null = null): string | null {
  const named = notes?.split("\n")[0].match(/^slide\s*\d+\s*[:—–-]\s*(.{3,120})$/i);
  if (named) return named[1].trim();
  let best: SlideParagraph | null = null;
  for (const p of paragraphs) {
    if (p.text.length < 3 || p.text.length > 100 || SKIP_TITLE.test(p.text)) continue;
    if (!best || p.size > best.size) best = p;
  }
  return best ? best.text.replace(/\s+/g, " ").slice(0, 120) : null;
}

/** The speaker notes: the notes page's body placeholder. */
export function notesText(root: XmlElement): string | null {
  const lines: string[] = [];
  for (const sp of shapesIn(path(root, "p:cSld", "p:spTree"))) {
    const ph = path(sp, "p:nvSpPr", "p:nvPr", "p:ph");
    if (!ph || attr(ph, "type") !== "body") continue;
    for (const p of children(child(sp, "p:txBody"), "a:p")) lines.push(paragraphText(p).trim());
  }
  const text = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return text || null;
}

/* ------------------------------------------------------------------- render */

export type SlideRender = { html: string; warnings: string[] };

type RCtx = {
  deck: Deck;
  slide: DeckSlide;
  /** px per point: slides are drawn 960px wide. */
  scale: number;
  imageSrc: (part: string) => string | null;
  warnings: Set<string>;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const r2 = (n: number) => Math.round(n * 100) / 100;

export const SLIDE_WIDTH_PX = 960;

/** Draws one slide as HTML, `SLIDE_WIDTH_PX` wide, for the fallback path. */
export function renderSlideHtml(deck: Deck, index: number, imageSrc: (part: string) => string | null): SlideRender {
  const slide = deck.slides[index];
  const scale = SLIDE_WIDTH_PX / (deck.width / EMU_PER_PT);
  const ctx: RCtx = { deck, slide, scale, imageSrc, warnings: new Set() };
  const px = (emu: number) => r2((emu / EMU_PER_PT) * scale);

  const bg = slideBackground(ctx);
  const tree = path(slide.root, "p:cSld", "p:spTree");
  const body = elements(tree).map((el) => shapeHtml(el, ctx, null)).join("");
  const html = `<div class="slide" style="position:relative;overflow:hidden;width:${px(deck.width)}px;height:${px(deck.height)}px;background:${bg}">${body}</div>`;
  return { html, warnings: [...ctx.warnings] };
}

function slideBackground(ctx: RCtx): string {
  const { slide, deck } = ctx;
  const layout = relOfType(slide.rels, "slideLayout");
  const master = layout ? relOfType(relsFor(deck.zip, layout), "slideMaster") : null;
  const roots = [slide.root, ...[layout, master].map((p) => (p && zipText(deck.zip, p) ? parseXml(zipText(deck.zip, p)!) : null))];
  for (const root of roots) {
    const bg = path(root, "p:cSld", "p:bg");
    if (!bg) continue;
    const fill = child(child(bg, "p:bgPr"), "a:solidFill");
    if (fill) return css(colorOf(colorChild(fill), deck.theme) ?? hexToRgb("#ffffff"));
    const ref = child(bg, "p:bgRef");
    if (ref) return css(colorOf(colorChild(ref), deck.theme) ?? hexToRgb("#ffffff"));
    if (child(child(bg, "p:bgPr"), "a:gradFill")) ctx.warnings.add("gradient background drawn as its first colour");
  }
  return "#ffffff";
}

type Box = { x: number; y: number; w: number; h: number; rot: number; flipH: boolean; flipV: boolean };

function xfrmOf(spPr: XmlElement | null): Box | null {
  const x = child(spPr, "a:xfrm");
  const off = child(x, "a:off");
  const ext = child(x, "a:ext");
  if (!off || !ext) return null;
  return {
    x: num(off, "x") ?? 0,
    y: num(off, "y") ?? 0,
    w: num(ext, "cx") ?? 0,
    h: num(ext, "cy") ?? 0,
    rot: (num(x, "rot") ?? 0) / 60000,
    flipH: attr(x, "flipH") === "1",
    flipV: attr(x, "flipV") === "1",
  };
}

/** Maps a child's box into its group's coordinate space. */
type GroupMap = (b: Box) => Box;

function shapeHtml(el: XmlElement, ctx: RCtx, map: GroupMap | null): string {
  switch (el.name) {
    case "p:sp":
    case "p:cxnSp":
      return spHtml(el, ctx, map);
    case "p:pic":
      return picHtml(el, ctx, map);
    case "p:grpSp":
      return groupHtml(el, ctx, map);
    case "mc:AlternateContent":
      return elements(child(el, "mc:Fallback")).map((c) => shapeHtml(c, ctx, map)).join("");
    case "p:nvGrpSpPr":
    case "p:grpSpPr":
    case "p:extLst":
      return "";
    default:
      ctx.warnings.add(`${el.name} not drawn`);
      return "";
  }
}

function groupHtml(el: XmlElement, ctx: RCtx, outer: GroupMap | null): string {
  const x = child(child(el, "p:grpSpPr"), "a:xfrm");
  const off = child(x, "a:off");
  const ext = child(x, "a:ext");
  const chOff = child(x, "a:chOff");
  const chExt = child(x, "a:chExt");
  let map: GroupMap = (b) => b;
  if (off && ext && chOff && chExt) {
    const sx = (num(ext, "cx") ?? 1) / ((num(chExt, "cx") ?? 1) || 1);
    const sy = (num(ext, "cy") ?? 1) / ((num(chExt, "cy") ?? 1) || 1);
    map = (b) => ({
      ...b,
      x: (num(off, "x") ?? 0) + (b.x - (num(chOff, "x") ?? 0)) * sx,
      y: (num(off, "y") ?? 0) + (b.y - (num(chOff, "y") ?? 0)) * sy,
      w: b.w * sx,
      h: b.h * sy,
    });
  }
  const composed: GroupMap = outer ? (b) => outer(map(b)) : map;
  return elements(el).map((c) => shapeHtml(c, ctx, composed)).join("");
}

function boxCss(b: Box, ctx: RCtx): string[] {
  const px = (emu: number) => r2((emu / EMU_PER_PT) * ctx.scale);
  const out = [`position:absolute`, `left:${px(b.x)}px`, `top:${px(b.y)}px`, `width:${px(b.w)}px`, `height:${px(b.h)}px`];
  const t: string[] = [];
  if (b.rot) t.push(`rotate(${r2(b.rot)}deg)`);
  if (b.flipH) t.push("scaleX(-1)");
  if (b.flipV) t.push("scaleY(-1)");
  if (t.length) out.push(`transform:${t.join(" ")}`);
  return out;
}

function themeRef(el: XmlElement, ref: string, ctx: RCtx) {
  const r = path(el, "p:style", ref);
  return r ? { idx: num(r, "idx") ?? 0, color: colorOf(colorChild(r), ctx.deck.theme) } : null;
}

function fillCss(spPr: XmlElement | null, el: XmlElement, ctx: RCtx): string | null {
  if (child(spPr, "a:noFill")) return null;
  const solid = child(spPr, "a:solidFill");
  if (solid) {
    const c = colorOf(colorChild(solid), ctx.deck.theme);
    return c ? css(c) : null;
  }
  const grad = child(spPr, "a:gradFill");
  if (grad) {
    const stops = children(child(grad, "a:gsLst"), "a:gs")
      .map((gs) => ({ pos: (num(gs, "pos") ?? 0) / 1000, c: colorOf(colorChild(gs), ctx.deck.theme) }))
      .filter((s) => s.c);
    const ang = (num(child(grad, "a:lin"), "ang") ?? 0) / 60000;
    if (stops.length) return `linear-gradient(${r2(ang + 90)}deg,${stops.map((s) => `${css(s.c!)} ${r2(s.pos)}%`).join(",")})`;
  }
  if (child(spPr, "a:blipFill") || child(spPr, "a:pattFill")) ctx.warnings.add("picture or pattern fill on a shape not drawn");
  const ref = themeRef(el, "a:fillRef", ctx);
  return ref && ref.idx > 0 && ref.color ? css(ref.color) : null;
}

function lineOf(spPr: XmlElement | null, el: XmlElement, ctx: RCtx): { width: number; color: string; dash: string } | null {
  const ln = child(spPr, "a:ln");
  const ref = themeRef(el, "a:lnRef", ctx);
  const themeLn = ref && ref.idx > 0 ? ctx.deck.theme.lines[ref.idx - 1] ?? null : null;
  if (child(ln, "a:noFill")) return null;
  const fill = child(ln, "a:solidFill");
  const color = fill ? colorOf(colorChild(fill), ctx.deck.theme) : ln || themeLn ? ref?.color ?? null : null;
  if (!color) return null;
  const widthEmu = num(ln, "w") ?? num(themeLn, "w") ?? 12700;
  const dash = attr(child(ln, "a:prstDash"), "val") ?? "solid";
  return {
    width: Math.max(0.5, r2((widthEmu / EMU_PER_PT) * ctx.scale)),
    color: css(color),
    dash: dash === "solid" ? "solid" : /dot/i.test(dash) && !/dash/i.test(dash) ? "dotted" : "dashed",
  };
}

function shadowCss(spPr: XmlElement | null, el: XmlElement, ctx: RCtx): string | null {
  let effects = child(spPr, "a:effectLst");
  if (!effects) {
    const ref = themeRef(el, "a:effectRef", ctx);
    if (ref && ref.idx > 0) effects = child(ctx.deck.theme.effects[ref.idx - 1] ?? null, "a:effectLst");
  }
  const sh = child(effects, "a:outerShdw");
  if (!sh) return null;
  const c = colorOf(colorChild(sh), ctx.deck.theme) ?? { r: 0, g: 0, b: 0, a: 0.35 };
  const toPx = (emu: number) => r2((emu / EMU_PER_PT) * ctx.scale);
  const dist = toPx(num(sh, "dist") ?? 0);
  const dir = ((num(sh, "dir") ?? 0) / 60000) * (Math.PI / 180);
  return `${r2(Math.cos(dir) * dist)}px ${r2(Math.sin(dir) * dist)}px ${toPx(num(sh, "blurRad") ?? 0)}px ${css(c)}`;
}

function geometryCss(spPr: XmlElement | null, b: Box, ctx: RCtx): { radius: string | null; line: boolean } {
  const geom = child(spPr, "a:prstGeom");
  const prst = attr(geom, "prst") ?? (child(spPr, "a:custGeom") ? "custom" : "rect");
  const px = (emu: number) => r2((emu / EMU_PER_PT) * ctx.scale);
  if (prst === "rect") return { radius: null, line: false };
  if (prst === "roundRect") {
    const gd = children(child(geom, "a:avLst"), "a:gd").find((g) => attr(g, "name") === "adj");
    const adj = gd ? Number((attr(gd, "fmla") ?? "").replace(/^val\s+/, "")) : 16667;
    return { radius: `${px((Math.min(b.w, b.h) * (Number.isFinite(adj) ? adj : 16667)) / 100000)}px`, line: false };
  }
  if (prst === "ellipse") return { radius: "50%", line: false };
  if (prst === "line" || prst === "straightConnector1") return { radius: null, line: true };
  ctx.warnings.add(`shape "${prst}" drawn as a rectangle`);
  return { radius: null, line: false };
}

function spHtml(el: XmlElement, ctx: RCtx, map: GroupMap | null): string {
  const spPr = child(el, "p:spPr");
  const raw = xfrmOf(spPr);
  if (!raw) {
    if (path(el, "p:nvSpPr", "p:nvPr", "p:ph")) ctx.warnings.add("placeholder without its own position not drawn");
    return "";
  }
  const b = map ? map(raw) : raw;
  const geo = geometryCss(spPr, b, ctx);
  const line = lineOf(spPr, el, ctx);

  if (geo.line) {
    if (!line) return "";
    const w = r2((b.w / EMU_PER_PT) * ctx.scale);
    const h = r2((b.h / EMU_PER_PT) * ctx.scale);
    const [x1, x2] = b.flipH ? [w, 0] : [0, w];
    const [y1, y2] = b.flipV ? [h, 0] : [0, h];
    const box = boxCss({ ...b, flipH: false, flipV: false }, ctx);
    const dash = line.dash === "dashed" ? ` stroke-dasharray="${line.width * 3} ${line.width * 2}"` : line.dash === "dotted" ? ` stroke-dasharray="${line.width} ${line.width}"` : "";
    return `<svg style="${box.join(";")};overflow:visible" viewBox="0 0 ${Math.max(w, 1)} ${Math.max(h, 1)}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${line.color}" stroke-width="${line.width}"${dash}/></svg>`;
  }

  const style = boxCss(b, ctx);
  const fill = fillCss(spPr, el, ctx);
  if (fill) style.push(`background:${fill}`);
  if (line) style.push(`border:${line.width}px ${line.dash} ${line.color}`, "box-sizing:border-box");
  if (geo.radius) style.push(`border-radius:${geo.radius}`);
  const shadow = fill || line ? shadowCss(spPr, el, ctx) : null;
  if (shadow) style.push(`box-shadow:${shadow}`);

  const text = textBodyHtml(child(el, "p:txBody"), el, ctx);
  return `<div style="${style.join(";")}">${text}</div>`;
}

function picHtml(el: XmlElement, ctx: RCtx, map: GroupMap | null): string {
  const spPr = child(el, "p:spPr");
  const raw = xfrmOf(spPr);
  if (!raw) return "";
  const b = map ? map(raw) : raw;
  const blipFill = child(el, "p:blipFill");
  const embed = attr(child(blipFill, "a:blip"), "r:embed");
  const target = embed ? ctx.slide.rels.get(embed)?.target : undefined;
  const src = target ? ctx.imageSrc(target) : null;
  if (!src) {
    ctx.warnings.add("picture without an embedded image not drawn");
    return "";
  }
  const style = boxCss(b, ctx);
  style.push("overflow:hidden");
  const geo = geometryCss(spPr, b, ctx);
  if (geo.radius) style.push(`border-radius:${geo.radius}`);
  const line = lineOf(spPr, el, ctx);
  if (line) style.push(`border:${line.width}px ${line.dash} ${line.color}`, "box-sizing:border-box");
  const shadow = shadowCss(spPr, el, ctx);
  if (shadow) style.push(`box-shadow:${shadow}`);

  // srcRect crops the picture: each side in thousandths of a percent.
  const crop = child(blipFill, "a:srcRect");
  const l = (num(crop, "l") ?? 0) / 100000;
  const t = (num(crop, "t") ?? 0) / 100000;
  const r = (num(crop, "r") ?? 0) / 100000;
  const bt = (num(crop, "b") ?? 0) / 100000;
  const w = 1 - l - r || 1;
  const h = 1 - t - bt || 1;
  const img = `position:absolute;left:${r2((-l / w) * 100)}%;top:${r2((-t / h) * 100)}%;width:${r2((1 / w) * 100)}%;height:${r2((1 / h) * 100)}%;max-width:none`;
  const alt = attr(path(el, "p:nvPicPr", "p:cNvPr"), "descr") ?? "";
  return `<div style="${style.join(";")}"><img src="${esc(src)}" alt="${esc(alt)}" style="${img}"></div>`;
}

/* --------------------------------------------------------------------- text */

type RunProps = { size: number; bold: boolean; italic: boolean; underline: boolean; strike: boolean; caps: boolean; color: Rgba | null; font: string | null; baseline: number };
type ParaProps = { align: string; marL: number; indent: number; before: number | { pct: number }; after: number | { pct: number }; line: { pct: number } | { pts: number } | null; bullet: { char: string; color: Rgba | null; font: string | null; size: number } | null | "auto" };

function applyRun(r: RunProps, rPr: XmlElement | null | undefined, ctx: RCtx) {
  if (!rPr) return;
  const sz = num(rPr, "sz");
  if (sz !== undefined) r.size = sz / 100;
  const flag = (name: string) => {
    const v = attr(rPr, name);
    return v === undefined ? undefined : v === "1" || v === "true";
  };
  r.bold = flag("b") ?? r.bold;
  r.italic = flag("i") ?? r.italic;
  const u = attr(rPr, "u");
  if (u !== undefined) r.underline = u !== "none";
  const strike = attr(rPr, "strike");
  if (strike !== undefined) r.strike = strike !== "noStrike";
  const cap = attr(rPr, "cap");
  if (cap !== undefined) r.caps = cap === "all";
  const base = num(rPr, "baseline");
  if (base !== undefined) r.baseline = base / 1000;
  const fill = child(rPr, "a:solidFill");
  if (fill) r.color = colorOf(colorChild(fill), ctx.deck.theme) ?? r.color;
  const latin = attr(child(rPr, "a:latin"), "typeface");
  if (latin) {
    r.font = latin === "+mn-lt" ? ctx.deck.theme.fonts.minor : latin === "+mj-lt" ? ctx.deck.theme.fonts.major : latin;
  }
}

function applyPara(p: ParaProps, pPr: XmlElement | null | undefined, ctx: RCtx) {
  if (!pPr) return;
  const algn = attr(pPr, "algn");
  if (algn) p.align = algn === "ctr" ? "center" : algn === "r" ? "right" : algn === "just" || algn === "dist" ? "justify" : "left";
  const marL = num(pPr, "marL");
  if (marL !== undefined) p.marL = marL / EMU_PER_PT;
  const indent = num(pPr, "indent");
  if (indent !== undefined) p.indent = indent / EMU_PER_PT;
  const spacing = (name: string) => {
    const s = child(pPr, name);
    const pts = num(child(s, "a:spcPts"), "val");
    if (pts !== undefined) return pts / 100;
    const pct = num(child(s, "a:spcPct"), "val");
    return pct !== undefined ? { pct: pct / 100000 } : undefined;
  };
  p.before = spacing("a:spcBef") ?? p.before;
  p.after = spacing("a:spcAft") ?? p.after;
  const ln = child(pPr, "a:lnSpc");
  if (ln) {
    const pct = num(child(ln, "a:spcPct"), "val");
    const pts = num(child(ln, "a:spcPts"), "val");
    p.line = pct !== undefined ? { pct: pct / 100000 } : pts !== undefined ? { pts: pts / 100 } : p.line;
  }
  if (child(pPr, "a:buNone")) p.bullet = null;
  const bu = child(pPr, "a:buChar");
  if (bu) {
    const font = attr(child(pPr, "a:buFont"), "typeface") ?? null;
    const raw = attr(bu, "char") ?? "•";
    const symbol = font && /symbol|wingdings/i.test(font);
    p.bullet = {
      char: symbol || (raw.codePointAt(0) ?? 0) >= 0xf000 ? "•" : raw,
      color: colorOf(colorChild(child(pPr, "a:buClr")), ctx.deck.theme),
      font: symbol ? null : font,
      size: (num(child(pPr, "a:buSzPct"), "val") ?? 100000) / 100000,
    };
  }
  if (child(pPr, "a:buAutoNum")) p.bullet = "auto";
}

function textBodyHtml(body: XmlElement | null, shape: XmlElement, ctx: RCtx): string {
  if (!body) return "";
  const paras = children(body, "a:p");
  if (!paras.some((p) => paragraphText(p).trim())) return "";

  const bodyPr = child(body, "a:bodyPr");
  const ins = (name: string, d: number) => r2(((num(bodyPr, name) ?? d) / EMU_PER_PT) * ctx.scale);
  const anchor = attr(bodyPr, "anchor") ?? "t";
  const wrap = attr(bodyPr, "wrap") !== "none";
  const autofit = child(bodyPr, "a:normAutofit");
  const fontScale = (num(autofit, "fontScale") ?? 100000) / 100000;
  const lineReduce = (num(autofit, "lnSpcReduction") ?? 0) / 100000;
  const vert = attr(bodyPr, "vert");
  if (vert && vert !== "horz") ctx.warnings.add("vertical text drawn horizontally");

  const fontRef = path(shape, "p:style", "a:fontRef");
  const refColor = fontRef ? colorOf(colorChild(fontRef), ctx.deck.theme) : null;

  const sources = (lvl: number) => {
    const key = `a:lvl${lvl + 1}pPr`;
    return [path(ctx.deck.defaultTextStyle, key), path(ctx.deck.masterOtherStyle, key), path(child(body, "a:lstStyle"), key)];
  };

  const counters = new Map<number, number>();
  const html = paras
    .map((p) => {
      const pPr = child(p, "a:pPr");
      const lvl = num(pPr, "lvl") ?? 0;
      const pp: ParaProps = { align: "left", marL: 0, indent: 0, before: 0, after: 0, line: null, bullet: null };
      const rp: RunProps = { size: 18, bold: false, italic: false, underline: false, strike: false, caps: false, color: null, font: ctx.deck.theme.fonts.minor, baseline: 0 };
      for (const [i, s] of sources(lvl).entries()) {
        applyPara(pp, s, ctx);
        applyRun(rp, child(s, "a:defRPr"), ctx);
        // The shape style's font colour sits above the master's defaults.
        if (i === 1 && refColor) rp.color = refColor;
      }
      applyPara(pp, pPr, ctx);
      applyRun(rp, child(pPr, "a:defRPr"), ctx);

      const runs = elements(p).filter((c) => c.name === "a:r" || c.name === "a:br" || c.name === "a:fld");
      const endSize = num(child(p, "a:endParaRPr"), "sz");
      let maxSize = runs.length ? 0 : (endSize ?? rp.size * 100) / 100;
      const spans = runs
        .map((r) => {
          if (r.name === "a:br") return "<br>";
          const props: RunProps = { ...rp };
          applyRun(props, child(r, "a:rPr"), ctx);
          maxSize = Math.max(maxSize, props.size);
          const t = textOf(child(r, "a:t") ?? { name: "", attrs: {}, children: [] });
          return `<span style="${runCss(props, fontScale, ctx)}">${esc(t)}</span>`;
        })
        .join("");
      if (!maxSize) maxSize = rp.size;
      const size = maxSize * fontScale;

      const style: string[] = [
        `margin:0`,
        `text-align:${pp.align}`,
        `padding-left:${r2((pp.marL) * ctx.scale)}px`,
        `text-indent:${r2(pp.indent * ctx.scale)}px`,
      ];
      const sp = (v: number | { pct: number }) => r2((typeof v === "number" ? v : v.pct * size * 1.2) * ctx.scale);
      style.push(`padding-top:${sp(pp.before)}px`, `padding-bottom:${sp(pp.after)}px`);
      const line = pp.line
        ? "pct" in pp.line
          ? r2(1.2 * pp.line.pct * (1 - lineReduce))
          : `${r2(pp.line.pts * ctx.scale)}px`
        : r2(1.2 * (1 - lineReduce));
      style.push(`line-height:${line}`, `font-size:${r2(size * ctx.scale)}px`);

      let bullet = "";
      if (pp.bullet && paragraphText(p).trim()) {
        let mark: string;
        let color = rp.color;
        let font: string | null = rp.font;
        let rel = 1;
        if (pp.bullet === "auto") {
          const n = (counters.get(lvl) ?? 0) + 1;
          counters.set(lvl, n);
          mark = `${n}.`;
        } else {
          mark = pp.bullet.char;
          color = pp.bullet.color ?? color;
          font = pp.bullet.font ?? font;
          rel = pp.bullet.size;
        }
        const width = Math.max(0, -pp.indent) * ctx.scale;
        bullet = `<span style="display:inline-block;text-indent:0;min-width:${r2(width)}px;font-size:${r2(rel * 100)}%;${color ? `color:${css(color)};` : ""}font-family:${fontStack(font ?? undefined)}">${esc(mark)}</span>`;
      }
      return `<p style="${style.join(";")}">${bullet}${spans || "&#8203;"}</p>`;
    })
    .join("");

  const justify = anchor === "ctr" ? "center" : anchor === "b" ? "flex-end" : "flex-start";
  const box = [
    "position:absolute",
    "inset:0",
    "display:flex",
    "flex-direction:column",
    `justify-content:${justify}`,
    `padding:${ins("tIns", 45720)}px ${ins("rIns", 91440)}px ${ins("bIns", 45720)}px ${ins("lIns", 91440)}px`,
    "box-sizing:border-box",
    `white-space:${wrap ? "pre-wrap" : "pre"}`,
    "overflow-wrap:break-word",
  ];
  return `<div style="${box.join(";")}">${html}</div>`;
}

function runCss(r: RunProps, fontScale: number, ctx: RCtx): string {
  const out = [
    `font-size:${r2(r.size * fontScale * ctx.scale)}px`,
    `font-family:${fontStack(r.font ?? undefined)}`,
    `font-weight:${r.bold ? 700 : 400}`,
  ];
  if (r.italic) out.push("font-style:italic");
  const deco = [r.underline && "underline", r.strike && "line-through"].filter(Boolean).join(" ");
  if (deco) out.push(`text-decoration:${deco}`);
  if (r.caps) out.push("text-transform:uppercase");
  out.push(`color:${r.color ? css(r.color) : "#000"}`);
  if (r.baseline) out.push(`vertical-align:${r.baseline > 0 ? "super" : "sub"}`, "font-size:0.7em");
  return out.join(";");
}
