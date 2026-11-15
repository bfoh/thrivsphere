import type { Block, Borders, BorderLine, Cell, DocModel, Inline, Paragraph, RunStyle, Table } from "./docx";

/**
 * Document model → HTML.
 *
 * The same HTML is shown in the library and printed to the PDF, so what a
 * practitioner reads on screen is what prints. Every piece of text is
 * escaped and every style value is a number or a colour checked against a
 * pattern, so nothing from a document can become markup or script.
 *
 * Sizes stay in points, as Word measures them, so a 10pt paragraph prints at
 * 10pt and shows on screen at the size Word shows it at 100%.
 */

export type RenderOptions = {
  /** The URL for an image inside the .docx (`media/image1.png`), or null to leave it out. */
  imageSrc: (ref: string) => string | null;
};

export type RenderedSection = { id: string; title: string; level: number; text: string };

export type RenderedDoc = { html: string; sections: RenderedSection[]; words: number };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const COLOR = /^#[0-9a-f]{6}$/;
const color = (c: string | undefined) => (c && COLOR.test(c) ? c : undefined);
const pt = (n: number) => `${Math.round(n * 100) / 100}pt`;

/**
 * A CSS font stack for a font named in a document. Single-quoted, because
 * it goes inside double-quoted style attributes; the name is reduced to
 * letters, digits, spaces and hyphens first. Carlito has Calibri's exact
 * metrics, so text wraps where it does in Office when Calibri is missing.
 */
export function fontStack(name?: string): string {
  const clean = (name ?? "").replace(/[^A-Za-z0-9 -]/g, "").trim();
  const lead = clean ? `'${clean}', ${/^calibri\b/i.test(clean) ? "'Carlito', " : ""}` : "";
  if (/courier|mono|consolas/i.test(clean)) return `${lead}Menlo, Consolas, monospace`;
  if (/cambria|georgia|times|garamond|book antiqua|serif/i.test(clean) && !/sans/i.test(clean)) {
    return `${lead}Cambria, Georgia, 'Times New Roman', serif`;
  }
  return `${lead}Aptos, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif`;
}

function runCss(s: RunStyle, base?: RunStyle): string[] {
  const css: string[] = [];
  const diff = <K extends keyof RunStyle>(k: K) => !base || s[k] !== base[k];
  if (diff("bold")) css.push(`font-weight:${s.bold ? 700 : 400}`);
  if (diff("italic")) css.push(`font-style:${s.italic ? "italic" : "normal"}`);
  if (diff("underline") || diff("strike")) {
    const d = [s.underline && "underline", s.strike && "line-through"].filter(Boolean).join(" ");
    css.push(`text-decoration:${d || "none"}`);
  }
  if (diff("caps")) css.push(`text-transform:${s.caps ? "uppercase" : "none"}`);
  if (diff("smallCaps")) css.push(`font-variant:${s.smallCaps ? "small-caps" : "normal"}`);
  if (diff("color")) css.push(`color:${color(s.color) ?? "#000000"}`);
  if (diff("size") && s.size) css.push(`font-size:${pt(s.size)}`);
  if (diff("font")) css.push(`font-family:${fontStack(s.font)}`);
  const bg = color(s.highlight) ?? color(s.shading);
  const baseBg = base ? color(base.highlight) ?? color(base.shading) : undefined;
  if (bg !== baseBg) css.push(`background:${bg ?? "transparent"}`);
  if (diff("vertAlign")) {
    if (s.vertAlign) css.push(`vertical-align:${s.vertAlign}`, "font-size:0.7em");
  }
  return css;
}

function borderCss(b: BorderLine | null | undefined): string | null {
  if (!b) return null;
  return `${pt(b.width)} ${b.style} ${color(b.color) ?? "#000000"}`;
}

type Ctx = {
  opts: RenderOptions;
  columnPt: number;
  sections: RenderedSection[];
  current: RenderedSection;
  counter: number;
  headings: Map<Inline[], number>;
};

/* ---------------------------------------------------------------- headings */

const ROLE_LEVEL: Partial<Record<Paragraph["role"], number>> = { title: 0, h1: 1, h2: 2, h3: 3 };

type Found = { p: Paragraph; index: number; rowCells: number; shaded: boolean };

function allParagraphs(blocks: Block[], out: Found[] = [], rowCells = 0, shaded = false): Found[] {
  for (const b of blocks) {
    if (b.t === "p") out.push({ p: b, index: out.length, rowCells, shaded: shaded || !!b.style.shading });
    else if (b.t === "table")
      for (const r of b.rows) for (const c of r.cells) allParagraphs(c.blocks, out, r.cells.length, !!c.shading);
  }
  return out;
}

const BRAND = /^thrive\s?sphere\b/i;
const plain = (p: Paragraph) => inlineText(p.content).replace(/\s+/g, " ").trim();

/**
 * The size of a line that looks like a heading without using a heading
 * style: short and entirely bold. Many of the owner's documents set their
 * headings this way, often in a coloured one-cell table. Not the brand line
 * every page carries, a quoted example, or a column heading in a table.
 */
function lookedHeadingSize(f: Found, repeats: Map<string, number>): number | null {
  const { p } = f;
  if (p.role !== "p" || p.list || f.rowCells >= 3 || p.content.some((i) => i.t === "image")) return null;
  const runs = p.content.filter((i): i is Extract<Inline, { t: "text" }> => i.t === "text" && i.text.trim() !== "");
  if (!runs.length || !runs.every((r) => r.style.bold)) return null;
  const text = plain(p);
  if (text.length < 3 || text.length > 90 || !/[a-z]/i.test(text) || BRAND.test(text) || /^["“‘']/.test(text)) return null;
  if ((repeats.get(text.toLowerCase()) ?? 0) >= 3) return null;
  return Math.max(...runs.map((r) => r.style.size ?? 0));
}

/**
 * Which paragraphs are headings, and at what level: 0 is the document's
 * title, 1 and 2 are the sections listed in its contents. Keyed by the
 * paragraph's content array, which copies of the paragraph share.
 */
export function findHeadings(blocks: Block[]): Map<Inline[], number> {
  const paras = allParagraphs(blocks);
  const levels = new Map<Inline[], number>();

  const chars = new Map<number, number>();
  const repeats = new Map<string, number>();
  for (const { p } of paras) {
    for (const i of p.content) if (i.t === "text") chars.set(i.style.size ?? 0, (chars.get(i.style.size ?? 0) ?? 0) + i.text.length);
    const t = plain(p).toLowerCase();
    if (t) repeats.set(t, (repeats.get(t) ?? 0) + 1);
  }
  const body = [...chars].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;

  const styled = paras.filter(({ p }) => ROLE_LEVEL[p.role] !== undefined && plain(p) && !BRAND.test(plain(p)));
  for (const { p } of styled) levels.set(p.content, ROLE_LEVEL[p.role]!);
  const hasH1 = styled.some(({ p }) => p.role === "h1");
  let titleAt = styled.find(({ p }) => p.role === "title")?.index ?? -1;
  // Where the Title style holds only the brand, the first top heading is the title.
  const leadH1 = styled.find(({ p }) => p.role === "h1");
  if (titleAt === -1 && leadH1 && leadH1.index < 8) {
    levels.set(leadH1.p.content, 0);
    titleAt = leadH1.index;
  }
  const titled = titleAt !== -1;

  const candidates = paras
    .map((f) => ({ ...f, size: lookedHeadingSize(f, repeats) }))
    .filter((c): c is Found & { size: number } => c.size !== null);
  let looked = candidates.filter((c) => c.size > body);

  // Some documents mark headings only with bold capitals on a coloured band.
  if (looked.length + styled.filter(({ p }) => p.role !== "title").length < 3) {
    const banded = candidates.filter(
      (c) => c.size === body && c.shaded && plain(c.p) === plain(c.p).toUpperCase() && !/→.*→/.test(plain(c.p))
    );
    if (banded.length >= 3) looked = [...looked, ...banded].sort((a, b) => a.index - b.index);
  }
  if (!looked.length) return levels;

  // The largest line near the top is the title, unless a Title style exists.
  const largest = Math.max(...looked.map((c) => c.size));
  const title = !titled ? looked.find((c) => c.size === largest && c.index < 8) : undefined;
  if (title) {
    levels.set(title.p.content, 0);
    titleAt = title.index;
  }

  // Lines above the title are its kicker, not sections.
  const rest = looked.filter((c) => c !== title && c.index > titleAt);
  const top = rest.length ? Math.max(...rest.map((c) => c.size)) : 0;
  let seenTop = false;
  for (const c of rest) {
    const level = hasH1 ? 2 : c.size >= top ? 1 : 2;
    if (level === 1) seenTop = true;
    // A smaller bold line before the first section is a subtitle, not a section.
    if (level === 2 && !seenTop && !hasH1) continue;
    levels.set(c.p.content, level);
  }
  return levels;
}

function inlineText(content: Inline[]): string {
  return content
    .map((i) => (i.t === "text" ? i.text : i.t === "break" ? "\n" : i.t === "tab" ? " " : ""))
    .join("");
}

/** Adjacent runs that look the same become one, to keep the markup small. */
function mergeRuns(content: Inline[]): Inline[] {
  const out: Inline[] = [];
  for (const i of content) {
    const prev = out[out.length - 1];
    if (i.t === "text" && prev?.t === "text" && prev.href === i.href && JSON.stringify(prev.style) === JSON.stringify(i.style)) {
      out[out.length - 1] = { ...prev, text: prev.text + i.text };
    } else out.push(i);
  }
  return out;
}

function renderInlines(content: Inline[], base: RunStyle, ctx: Ctx): string {
  let html = "";
  for (const i of mergeRuns(content)) {
    if (i.t === "break") html += "<br>";
    else if (i.t === "tab") html += '<span class="ld-tab"></span>';
    else if (i.t === "image") {
      const src = ctx.opts.imageSrc(i.ref);
      if (!src) continue;
      const w = Math.max(1, i.width);
      const h = Math.max(1, i.height);
      html += `<img src="${esc(src)}" alt="${esc(i.alt)}" width="${w}" height="${h}" loading="lazy" style="width:${pt(w * 0.75)};aspect-ratio:${w}/${h}">`;
    } else {
      const css = runCss(i.style, base);
      const text = esc(i.text);
      const span = css.length ? `<span style="${css.join(";")}">${text}</span>` : text;
      const href = i.href && /^(https?:|mailto:)/i.test(i.href) ? i.href : null;
      html += href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${span}</a>` : span;
    }
  }
  return html;
}

function lineHeight(p: Paragraph): string {
  const l = p.style.line;
  if (!l) return "1.17";
  if ("multiple" in l) return (1.17 * l.multiple).toFixed(3);
  if ("exact" in l) return pt(l.exact);
  return `max(1.17em, ${pt(l.atLeast)})`;
}

function paragraphHtml(p: Paragraph, ctx: Ctx, inGroup: boolean): string {
  const s = p.style;
  const css: string[] = [];
  const indentLeft = p.list ? p.list.indent : s.indentLeft;
  css.push(
    `margin:${pt(s.before)} ${pt(inGroup ? 0 : s.indentRight)} ${pt(s.after)} ${pt(inGroup ? Math.max(0, indentLeft - groupLeft(p)) : indentLeft)}`
  );
  if (p.list) css.push(`text-indent:${pt(-p.list.hanging)}`);
  else if (s.firstLine) css.push(`text-indent:${pt(s.firstLine)}`);
  if (s.align && s.align !== "left") css.push(`text-align:${s.align}`);
  css.push(`line-height:${lineHeight(p)}`);
  css.push(...runCss(p.text));
  if (s.keepNext) css.push("break-after:avoid");

  const level = ctx.headings.get(p.content);
  const tag = level === undefined ? "p" : `h${level + 2}`;
  const text = inlineText(p.content).replace(/\s+/g, " ").trim();

  let id = "";
  if (level !== undefined && text) {
    ctx.counter += 1;
    const section: RenderedSection = { id: `s${ctx.counter}`, title: text.slice(0, 140), level, text: "" };
    ctx.sections.push(section);
    ctx.current = section;
    id = ` id="${section.id}"`;
  }
  if (text) ctx.current.text += (ctx.current.text ? "\n" : "") + (p.list ? `${p.list.marker} ` : "") + text;

  const marker = p.list
    ? `<span class="ld-marker" style="${[`min-width:${pt(p.list.hanging)}`, ...runCss(p.list.markerStyle, p.text)].join(";")}">${esc(p.list.marker)}</span>`
    : "";
  const body = renderInlines(p.content, p.text, ctx);
  return `<${tag}${id} class="ld-p" style="${css.join(";")}">${marker}${body || "​"}</${tag}>`;
}

/** The left edge of a paragraph's shading: Word shades from the left indent. */
function groupLeft(p: Paragraph) {
  return p.list ? 0 : p.style.indentLeft;
}

function groupKey(p: Paragraph): string | null {
  const s = p.style;
  const b = s.borders;
  const hasBorder = b && (b.top || b.right || b.bottom || b.left);
  if (!s.shading && !hasBorder) return null;
  return JSON.stringify([s.shading ?? null, b ?? null, groupLeft(p), s.indentRight]);
}

function groupHtml(paras: Paragraph[], ctx: Ctx): string {
  const first = paras[0];
  const last = paras[paras.length - 1];
  const s = first.style;
  const b: Borders = s.borders ?? {};
  const css: string[] = [`margin:${pt(first.style.before)} ${pt(s.indentRight)} ${pt(last.style.after)} ${pt(groupLeft(first))}`];
  if (color(s.shading)) css.push(`background:${s.shading}`);
  const pad = (side: keyof Borders, dflt: number) => (b[side] ? Math.max(b[side]!.space, 2) + 2 : dflt);
  css.push(`padding:${pt(pad("top", 3))} ${pt(pad("right", 6))} ${pt(pad("bottom", 3))} ${pt(pad("left", 6))}`);
  for (const side of ["top", "right", "bottom", "left"] as const) {
    const line = borderCss(b[side]);
    if (line) css.push(`border-${side}:${line}`);
  }
  const inner = paras
    .map((p, i) => {
      const copy: Paragraph = {
        ...p,
        style: { ...p.style, before: i === 0 ? 0 : p.style.before, after: i === paras.length - 1 ? 0 : p.style.after },
      };
      return paragraphHtml(copy, ctx, true);
    })
    .join("");
  return `<div class="ld-group" style="${css.join(";")}">${inner}</div>`;
}

function cellHtml(cell: Cell, ctx: Ctx, header: boolean): string {
  const css: string[] = [];
  for (const side of ["top", "right", "bottom", "left"] as const) {
    const line = borderCss(cell.borders[side]);
    css.push(`border-${side}:${line ?? "none"}`);
  }
  css.push(`padding:${pt(cell.padding.top)} ${pt(cell.padding.right)} ${pt(cell.padding.bottom)} ${pt(cell.padding.left)}`);
  if (color(cell.shading)) css.push(`background:${cell.shading}`);
  if (cell.vAlign) css.push(`vertical-align:${cell.vAlign}`);
  const span = `${cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : ""}${cell.rowSpan > 1 ? ` rowspan="${cell.rowSpan}"` : ""}`;
  const tag = header ? "th" : "td";
  return `<${tag}${span} style="${css.join(";")}"><div class="ld-flow">${blocksHtml(cell.blocks, ctx)}</div></${tag}>`;
}

function tableHtml(t: Table, ctx: Ctx): string {
  const grid = t.columns.length ? t.columns : [1];
  const gridTotal = grid.reduce((a, b) => a + b, 0) || 1;
  const widthPt = t.width ?? gridTotal;
  const percent = t.widthPercent ?? Math.min(100, (widthPt / ctx.columnPt) * 100);
  const css = [`width:${percent.toFixed(2)}%`];
  if (t.align === "center") css.push("margin-left:auto", "margin-right:auto");
  if (t.align === "right") css.push("margin-left:auto");
  const cols = grid.map((c) => `<col style="width:${((c / gridTotal) * 100).toFixed(3)}%">`).join("");
  const rows = t.rows
    .map((r) => {
      const h = r.minHeight ? ` style="height:${pt(r.minHeight)}"` : "";
      return `<tr${h}>${r.cells.map((c) => cellHtml(c, ctx, r.header)).join("")}</tr>`;
    })
    .join("");
  return `<table class="ld-table" style="${css.join(";")}"><colgroup>${cols}</colgroup><tbody>${rows}</tbody></table>`;
}

function blocksHtml(blocks: Block[], ctx: Ctx): string {
  let html = "";
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.t === "pagebreak") {
      html += '<div class="ld-break" aria-hidden="true"></div>';
    } else if (b.t === "table") {
      html += tableHtml(b, ctx);
    } else {
      const key = groupKey(b);
      if (!key) {
        html += paragraphHtml(b, ctx, false);
        continue;
      }
      const group: Paragraph[] = [b];
      while (i + 1 < blocks.length) {
        const next = blocks[i + 1];
        if (next.t !== "p" || groupKey(next) !== key) break;
        group.push(next);
        i++;
      }
      html += groupHtml(group, ctx);
    }
  }
  return html;
}

export function renderDoc(model: DocModel, opts: RenderOptions): RenderedDoc {
  const start: RenderedSection = { id: "s0", title: "", level: 0, text: "" };
  const ctx: Ctx = {
    opts,
    columnPt: (model.page.width - model.page.margins.left - model.page.margins.right) * 72,
    sections: [start],
    current: start,
    counter: 0,
    headings: findHeadings(model.blocks),
  };
  const body = blocksHtml(model.blocks, ctx);
  const sections = ctx.sections.filter((s) => s.id !== "s0" || s.text.trim());
  const words = sections.reduce((n, s) => n + (s.text.match(/\S+/g)?.length ?? 0), 0);
  return { html: `<div class="lib-doc">${body}</div>`, sections, words };
}

/**
 * Styles for rendered documents. Scoped to `.lib-doc`; shared by the
 * library page and the print build so the two cannot drift.
 */
export const DOC_CSS = `
.lib-doc{display:flex;flex-direction:column;font-family:${fontStack("Aptos")};font-size:11pt;line-height:1.17;color:#000;overflow-wrap:break-word;text-align:left}
.lib-doc .ld-p{margin:0;white-space:pre-wrap;font-size:inherit;font-weight:inherit}
.lib-doc .ld-group,.lib-doc .ld-flow{display:flex;flex-direction:column}
.lib-doc .ld-flow>:first-child{margin-top:0!important}
.lib-doc .ld-marker{display:inline-block;text-indent:0}
.lib-doc .ld-tab{display:inline-block;width:2.5em}
.lib-doc img{max-width:100%;height:auto;vertical-align:middle}
.lib-doc .ld-table{border-collapse:collapse;table-layout:fixed;margin:0 0 6pt;break-inside:auto}
.lib-doc .ld-table td,.lib-doc .ld-table th{text-align:left;font-weight:inherit;vertical-align:top;overflow-wrap:break-word}
.lib-doc .ld-table tr{break-inside:avoid}
.lib-doc a{color:#1f5f8b}
.lib-doc .ld-break{margin:18pt -12pt;border-top:1.5px dashed rgba(31,58,95,.18)}
@media print{
  .lib-doc .ld-break{break-before:page;margin:0;border:0;height:0}
  .lib-doc h2,.lib-doc h3,.lib-doc h4,.lib-doc h5{break-after:avoid}
  .lib-doc img{break-inside:avoid}
}
`;

/** A complete page for Chrome to print to PDF. `head` is trusted build-time markup (fonts). */
export function printDocumentHtml(fragment: string, model: DocModel, title: string, head = ""): string {
  const m = model.page.margins;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
@page{size:${model.page.width}in ${model.page.height}in;margin:${m.top}in ${m.right}in ${m.bottom}in ${m.left}in}
html,body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
${DOC_CSS}
</style>${head}</head><body>${fragment.replace(/ loading="lazy"/g, "")}</body></html>`;
}
