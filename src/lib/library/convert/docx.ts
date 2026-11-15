import {
  attr,
  child,
  children,
  elements,
  num,
  onOff,
  parseXml,
  path,
  textOf,
  type XmlElement,
} from "./xml";

/**
 * Word (.docx) → a plain document model.
 *
 * Styles are resolved here, once, so the model says exactly how each
 * paragraph and run looks and the renderer never needs to know about style
 * inheritance. Covered: paragraph and table styles with `basedOn`,
 * defaults, theme fonts, paragraph shading and borders (which macOS Quick
 * Look drops — the reason this exists), spacing, indents, alignment,
 * bullets and numbering, tables with merged cells and banding, inline
 * images, hyperlinks, line and page breaks, and the header and footer text.
 *
 * Measurements in the model are points unless named otherwise.
 */

export type BorderLine = { width: number; style: "solid" | "dashed" | "dotted" | "double"; color: string; space: number };
export type Borders = { top?: BorderLine | null; right?: BorderLine | null; bottom?: BorderLine | null; left?: BorderLine | null };

export type RunStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  caps?: boolean;
  smallCaps?: boolean;
  color?: string;
  size?: number;
  font?: string;
  highlight?: string;
  shading?: string;
  vertAlign?: "super" | "sub";
};

export type Inline =
  | { t: "text"; text: string; style: RunStyle; href?: string }
  | { t: "break" }
  | { t: "tab" }
  | { t: "image"; ref: string; width: number; height: number; alt: string };

export type ParaStyle = {
  align?: "left" | "center" | "right" | "justify";
  before: number;
  after: number;
  /** Multiple of single spacing, or a fixed height in points. */
  line?: { multiple: number } | { exact: number } | { atLeast: number };
  indentLeft: number;
  indentRight: number;
  /** Positive indents the first line; negative hangs it. */
  firstLine: number;
  shading?: string;
  borders?: Borders;
  keepNext?: boolean;
};

export type ParagraphRole = "title" | "subtitle" | "h1" | "h2" | "h3" | "caption" | "p";

export type Paragraph = {
  t: "p";
  role: ParagraphRole;
  styleId: string;
  style: ParaStyle;
  /** How text in this paragraph looks unless a run says otherwise. */
  text: RunStyle;
  list?: { marker: string; indent: number; hanging: number; markerStyle: RunStyle };
  contextualSpacing?: boolean;
  content: Inline[];
};

export type Cell = {
  colSpan: number;
  rowSpan: number;
  width?: number;
  shading?: string;
  vAlign?: "top" | "middle" | "bottom";
  borders: Borders;
  padding: { top: number; right: number; bottom: number; left: number };
  blocks: Block[];
};

export type Row = { cells: Cell[]; header: boolean; minHeight?: number };

export type Table = {
  t: "table";
  /** Percentage of the text column, where the document sets one. */
  widthPercent?: number;
  width?: number;
  align?: "left" | "center" | "right";
  columns: number[];
  rows: Row[];
};

export type Block = Paragraph | Table | { t: "pagebreak" };

export type DocModel = {
  page: { width: number; height: number; margins: { top: number; right: number; bottom: number; left: number } };
  blocks: Block[];
  header: string | null;
  footer: string | null;
};

export type DocxParts = {
  document: string;
  styles?: string | null;
  numbering?: string | null;
  theme?: string | null;
  /** word/_rels/document.xml.rels */
  rels?: string | null;
  headers?: string[];
  footers?: string[];
};

/* ------------------------------------------------------------------ styles */

type StyleDef = {
  id: string;
  type: string;
  name: string;
  basedOn?: string;
  pPr?: XmlElement | null;
  rPr?: XmlElement | null;
  tblPr?: XmlElement | null;
  tcPr?: XmlElement | null;
  conditional: Map<string, { pPr?: XmlElement | null; rPr?: XmlElement | null; tcPr?: XmlElement | null; tblPr?: XmlElement | null }>;
};

type Context = {
  styles: Map<string, StyleDef>;
  defaultParagraphStyle: string | null;
  docDefaults: { pPr: XmlElement | null; rPr: XmlElement | null };
  themeFonts: { major: string | null; minor: string | null };
  numbering: Numbering;
  rels: Map<string, { target: string; external: boolean }>;
  counters: Map<string, number[]>;
};

const twip = (v: number | undefined) => (v === undefined ? undefined : v / 20);
const hex = (v: string | undefined) => (v && /^[0-9a-f]{6}$/i.test(v) ? `#${v.toLowerCase()}` : undefined);

function readStyles(xml: string | null | undefined) {
  const styles = new Map<string, StyleDef>();
  let defaultParagraphStyle: string | null = null;
  let docDefaults = { pPr: null as XmlElement | null, rPr: null as XmlElement | null };
  if (!xml) return { styles, defaultParagraphStyle, docDefaults };
  const root = parseXml(xml);
  const dd = child(root, "w:docDefaults");
  docDefaults = { pPr: path(dd, "w:pPrDefault", "w:pPr"), rPr: path(dd, "w:rPrDefault", "w:rPr") };
  for (const s of children(root, "w:style")) {
    const id = attr(s, "w:styleId");
    if (!id) continue;
    const conditional = new Map<string, { pPr?: XmlElement | null; rPr?: XmlElement | null; tcPr?: XmlElement | null; tblPr?: XmlElement | null }>();
    for (const c of children(s, "w:tblStylePr")) {
      const type = attr(c, "w:type");
      if (type) conditional.set(type, { pPr: child(c, "w:pPr"), rPr: child(c, "w:rPr"), tcPr: child(c, "w:tcPr"), tblPr: child(c, "w:tblPr") });
    }
    const def: StyleDef = {
      id,
      type: attr(s, "w:type") ?? "paragraph",
      name: attr(child(s, "w:name"), "w:val") ?? id,
      basedOn: attr(child(s, "w:basedOn"), "w:val"),
      pPr: child(s, "w:pPr"),
      rPr: child(s, "w:rPr"),
      tblPr: child(s, "w:tblPr"),
      tcPr: child(s, "w:tcPr"),
      conditional,
    };
    styles.set(id, def);
    if (def.type === "paragraph" && attr(s, "w:default") === "1") defaultParagraphStyle = id;
  }
  return { styles, defaultParagraphStyle, docDefaults };
}

/** A style and its ancestors, most general first. */
function styleChain(ctx: Context, id: string | null | undefined): StyleDef[] {
  const chain: StyleDef[] = [];
  const seen = new Set<string>();
  let cur = id ? ctx.styles.get(id) : undefined;
  while (cur && !seen.has(cur.id)) {
    chain.unshift(cur);
    seen.add(cur.id);
    cur = cur.basedOn ? ctx.styles.get(cur.basedOn) : undefined;
  }
  return chain;
}

function readTheme(xml: string | null | undefined) {
  if (!xml) return { major: null, minor: null };
  const root = parseXml(xml);
  const fonts = path(root, "a:themeElements", "a:fontScheme");
  return {
    major: attr(path(fonts, "a:majorFont", "a:latin"), "typeface") ?? null,
    minor: attr(path(fonts, "a:minorFont", "a:latin"), "typeface") ?? null,
  };
}

/* --------------------------------------------------------------- numbering */

type Level = { format: string; text: string; start: number; indent: number; hanging: number; rPr: XmlElement | null };
type Numbering = Map<string, Map<number, Level>>;

function readNumbering(xml: string | null | undefined): Numbering {
  const out: Numbering = new Map();
  if (!xml) return out;
  const root = parseXml(xml);
  const abstract = new Map<string, Map<number, Level>>();
  for (const a of children(root, "w:abstractNum")) {
    const levels = new Map<number, Level>();
    for (const l of children(a, "w:lvl")) {
      const ind = path(l, "w:pPr", "w:ind");
      levels.set(num(l, "w:ilvl") ?? 0, {
        format: attr(child(l, "w:numFmt"), "w:val") ?? "bullet",
        text: attr(child(l, "w:lvlText"), "w:val") ?? "•",
        start: num(child(l, "w:start"), "w:val") ?? 1,
        indent: twip(num(ind, "w:left") ?? num(ind, "w:start")) ?? 36,
        hanging: twip(num(ind, "w:hanging")) ?? 18,
        rPr: child(l, "w:rPr"),
      });
    }
    const id = attr(a, "w:abstractNumId");
    if (id) abstract.set(id, levels);
  }
  for (const n of children(root, "w:num")) {
    const id = attr(n, "w:numId");
    const abs = attr(child(n, "w:abstractNumId"), "w:val");
    if (id && abs && abstract.has(abs)) out.set(id, abstract.get(abs)!);
  }
  return out;
}

/** Symbol-font bullets are private-use characters; show them as ordinary ones. */
function bulletChar(text: string): string {
  const c = text.codePointAt(0) ?? 0;
  if (!text || c === 0xf0b7 || c === 0xf0a7 || c === 0xf0fc) return "•";
  if (c === 0xf06f || text === "o") return "◦";
  if (c === 0xf0a8 || c === 0xf0d8 || c === 0xf075) return "▪";
  return c >= 0xf000 && c <= 0xf0ff ? "•" : text;
}

function formatNumber(n: number, format: string): string {
  if (format === "lowerLetter") return String.fromCharCode(96 + (((n - 1) % 26) + 1));
  if (format === "upperLetter") return String.fromCharCode(64 + (((n - 1) % 26) + 1));
  if (format === "lowerRoman" || format === "upperRoman") {
    const map: [number, string][] = [[10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
    let r = "";
    let v = n;
    for (const [k, s] of map) while (v >= k) { r += s; v -= k; }
    return format === "upperRoman" ? r.toUpperCase() : r;
  }
  return String(n);
}

/* ------------------------------------------------------------- properties */

type PProps = ParaStyle & {
  pageBreakBefore?: boolean;
  contextualSpacing?: boolean;
  numId?: string;
  ilvl?: number;
  outline?: number;
};

const emptyPara = (): PProps => ({ before: 0, after: 0, indentLeft: 0, indentRight: 0, firstLine: 0 });

function borderLine(el: XmlElement | null): BorderLine | null | undefined {
  if (!el) return undefined;
  const val = attr(el, "w:val") ?? "single";
  if (val === "nil" || val === "none") return null;
  const style: BorderLine["style"] =
    val === "dashed" || val === "dashSmallGap" || val === "dotDash" ? "dashed" : val === "dotted" ? "dotted" : val.startsWith("double") ? "double" : "solid";
  return {
    width: Math.max(0.5, (num(el, "w:sz") ?? 4) / 8),
    style,
    color: hex(attr(el, "w:color")) ?? "#000000",
    space: num(el, "w:space") ?? 0,
  };
}

function readBorders(el: XmlElement | null, names: { top: string; right: string; bottom: string; left: string }): Borders | undefined {
  if (!el) return undefined;
  const b: Borders = {};
  for (const side of ["top", "right", "bottom", "left"] as const) {
    const line = borderLine(child(el, names[side]) ?? (side === "left" ? child(el, "w:start") : side === "right" ? child(el, "w:end") : null));
    if (line !== undefined) b[side] = line;
  }
  return b;
}

function applyPPr(p: PProps, pPr: XmlElement | null | undefined) {
  if (!pPr) return;
  const jc = attr(child(pPr, "w:jc"), "w:val");
  if (jc) p.align = jc === "center" ? "center" : jc === "right" || jc === "end" ? "right" : jc === "both" || jc === "distribute" ? "justify" : "left";
  const sp = child(pPr, "w:spacing");
  if (sp) {
    const before = twip(num(sp, "w:before"));
    const after = twip(num(sp, "w:after"));
    if (before !== undefined) p.before = before;
    if (after !== undefined) p.after = after;
    const line = num(sp, "w:line");
    if (line !== undefined) {
      const rule = attr(sp, "w:lineRule") ?? "auto";
      p.line = rule === "exact" ? { exact: line / 20 } : rule === "atLeast" ? { atLeast: line / 20 } : { multiple: line / 240 };
    }
  }
  const ind = child(pPr, "w:ind");
  if (ind) {
    const left = twip(num(ind, "w:left") ?? num(ind, "w:start"));
    const right = twip(num(ind, "w:right") ?? num(ind, "w:end"));
    if (left !== undefined) p.indentLeft = left;
    if (right !== undefined) p.indentRight = right;
    const first = twip(num(ind, "w:firstLine"));
    const hanging = twip(num(ind, "w:hanging"));
    if (hanging !== undefined) p.firstLine = -hanging;
    else if (first !== undefined) p.firstLine = first;
  }
  const shd = child(pPr, "w:shd");
  if (shd) p.shading = hex(attr(shd, "w:fill"));
  const bdr = readBorders(child(pPr, "w:pBdr"), { top: "w:top", right: "w:right", bottom: "w:bottom", left: "w:left" });
  if (bdr) p.borders = { ...p.borders, ...bdr };
  const keep = onOff(child(pPr, "w:keepNext"));
  if (keep !== undefined) p.keepNext = keep;
  const pbb = onOff(child(pPr, "w:pageBreakBefore"));
  if (pbb !== undefined) p.pageBreakBefore = pbb;
  const ctx = onOff(child(pPr, "w:contextualSpacing"));
  if (ctx !== undefined) p.contextualSpacing = ctx;
  const numPr = child(pPr, "w:numPr");
  if (numPr) {
    const id = attr(child(numPr, "w:numId"), "w:val");
    if (id !== undefined) p.numId = id;
    const lvl = num(child(numPr, "w:ilvl"), "w:val");
    if (lvl !== undefined) p.ilvl = lvl;
  }
  const outline = num(child(pPr, "w:outlineLvl"), "w:val");
  if (outline !== undefined) p.outline = outline;
}

const HIGHLIGHTS: Record<string, string> = {
  yellow: "#ffff00", green: "#00ff00", cyan: "#00ffff", magenta: "#ff00ff", blue: "#0000ff", red: "#ff0000",
  darkBlue: "#00008b", darkCyan: "#008b8b", darkGreen: "#006400", darkMagenta: "#800080", darkRed: "#8b0000",
  darkYellow: "#808000", darkGray: "#a9a9a9", lightGray: "#d3d3d3", black: "#000000", white: "#ffffff",
};

function applyRPr(r: RunStyle, rPr: XmlElement | null | undefined, ctx: Context) {
  if (!rPr) return;
  const flag = (name: string, key: keyof RunStyle) => {
    const v = onOff(child(rPr, name));
    if (v !== undefined) (r as Record<string, unknown>)[key] = v;
  };
  flag("w:b", "bold");
  flag("w:i", "italic");
  flag("w:strike", "strike");
  flag("w:caps", "caps");
  flag("w:smallCaps", "smallCaps");
  const u = child(rPr, "w:u");
  if (u) r.underline = (attr(u, "w:val") ?? "single") !== "none";
  const color = attr(child(rPr, "w:color"), "w:val");
  if (color) r.color = color === "auto" ? undefined : hex(color) ?? r.color;
  const sz = num(child(rPr, "w:sz"), "w:val");
  if (sz !== undefined) r.size = sz / 2;
  const fonts = child(rPr, "w:rFonts");
  if (fonts) {
    const theme = attr(fonts, "w:asciiTheme") ?? attr(fonts, "w:hAnsiTheme");
    const named = attr(fonts, "w:ascii") ?? attr(fonts, "w:hAnsi");
    if (named) r.font = named;
    else if (theme) r.font = (theme.startsWith("major") ? ctx.themeFonts.major : ctx.themeFonts.minor) ?? r.font;
  }
  const hl = attr(child(rPr, "w:highlight"), "w:val");
  if (hl) r.highlight = hl === "none" ? undefined : HIGHLIGHTS[hl];
  const shd = child(rPr, "w:shd");
  if (shd) r.shading = hex(attr(shd, "w:fill"));
  const va = attr(child(rPr, "w:vertAlign"), "w:val");
  if (va) r.vertAlign = va === "superscript" ? "super" : va === "subscript" ? "sub" : undefined;
}

function roleFor(chain: StyleDef[], outline: number | undefined): ParagraphRole {
  for (let i = chain.length - 1; i >= 0; i--) {
    const key = chain[i].id.toLowerCase().replace(/\s/g, "");
    const name = chain[i].name.toLowerCase().replace(/\s/g, "");
    for (const k of [key, name]) {
      if (k === "title") return "title";
      if (k === "subtitle") return "subtitle";
      if (k === "caption") return "caption";
      const h = k.match(/^heading([1-9])$/);
      if (h) return h[1] === "1" ? "h1" : h[1] === "2" ? "h2" : "h3";
    }
  }
  if (outline !== undefined && outline <= 2) return outline === 0 ? "h1" : outline === 1 ? "h2" : "h3";
  return "p";
}

/* ------------------------------------------------------------------ tables */

type TableEnv = {
  styleId: string | null;
  /** Conditional formats that apply to the cell being read, in order. */
  conditions: string[];
};

function tableStyleLayers(ctx: Context, env: TableEnv | null) {
  if (!env?.styleId) return [] as { pPr?: XmlElement | null; rPr?: XmlElement | null; tcPr?: XmlElement | null }[];
  const chain = styleChain(ctx, env.styleId);
  const layers: { pPr?: XmlElement | null; rPr?: XmlElement | null; tcPr?: XmlElement | null }[] = [];
  for (const s of chain) layers.push({ pPr: s.pPr, rPr: s.rPr, tcPr: s.tcPr });
  for (const cond of env.conditions) for (const s of chain) {
    const c = s.conditional.get(cond);
    if (c) layers.push(c);
  }
  return layers;
}

function readTable(el: XmlElement, ctx: Context): Table {
  const tblPr = child(el, "w:tblPr");
  const styleId = attr(child(tblPr, "w:tblStyle"), "w:val") ?? null;
  const chain = styleId ? styleChain(ctx, styleId) : [];

  // Borders and cell margins: style first, then the table's own.
  const bNames = { top: "w:top", right: "w:right", bottom: "w:bottom", left: "w:left" };
  let outer: Borders = {};
  let insideH: BorderLine | null | undefined;
  let insideV: BorderLine | null | undefined;
  let margin = { top: 0, right: 5.4, bottom: 0, left: 5.4 };
  const take = (pr: XmlElement | null | undefined) => {
    const tb = child(pr, "w:tblBorders");
    if (tb) {
      outer = { ...outer, ...readBorders(tb, bNames) };
      const h = borderLine(child(tb, "w:insideH"));
      const v = borderLine(child(tb, "w:insideV"));
      if (h !== undefined) insideH = h;
      if (v !== undefined) insideV = v;
    }
    const cm = child(pr, "w:tblCellMar");
    if (cm) {
      for (const side of ["top", "right", "bottom", "left"] as const) {
        const e = child(cm, `w:${side}`) ?? (side === "left" ? child(cm, "w:start") : side === "right" ? child(cm, "w:end") : null);
        const w = twip(num(e, "w:w"));
        if (w !== undefined) margin = { ...margin, [side]: w };
      }
    }
  };
  for (const s of chain) take(s.tblPr);
  take(tblPr);

  const look = child(tblPr, "w:tblLook");
  const lookFlag = (name: string, bit: number, dflt: boolean) => {
    const a = attr(look, `w:${name}`);
    if (a !== undefined) return a === "1" || a === "true";
    const v = attr(look, "w:val");
    return v ? (parseInt(v, 16) & bit) !== 0 : dflt;
  };
  const firstRow = lookFlag("firstRow", 0x20, true);
  const bandRows = !lookFlag("noHBand", 0x200, false);

  const columns = children(child(el, "w:tblGrid"), "w:gridCol").map((g) => twip(num(g, "w:w")) ?? 0);
  const tblW = child(tblPr, "w:tblW");
  const wType = attr(tblW, "w:type");
  const wVal = num(tblW, "w:w");
  const jc = attr(child(tblPr, "w:jc"), "w:val");

  const rows: Row[] = [];
  // Open vertical merges, by grid column: the cell that started them.
  const merging = new Map<number, Cell>();
  const trs = children(el, "w:tr");
  trs.forEach((tr, rowIndex) => {
    const trPr = child(tr, "w:trPr");
    const conditions: string[] = [];
    const isHeader = firstRow && rowIndex === 0;
    if (bandRows && !isHeader) conditions.push((rowIndex - (firstRow ? 1 : 0)) % 2 === 0 ? "band1Horz" : "band2Horz");
    if (isHeader) conditions.push("firstRow");
    const env: TableEnv = { styleId, conditions };
    const layers = tableStyleLayers(ctx, env);

    const cells: Cell[] = [];
    let gridCol = 0;
    const tcs = elements(tr).flatMap((c) => (c.name === "w:sdt" ? children(child(c, "w:sdtContent"), "w:tc") : c.name === "w:tc" ? [c] : []));
    tcs.forEach((tc, colIndex) => {
      const tcPr = child(tc, "w:tcPr");
      const span = num(child(tcPr, "w:gridSpan"), "w:val") ?? 1;
      const vMergeEl = child(tcPr, "w:vMerge");
      const vMerge = vMergeEl ? (attr(vMergeEl, "w:val") === "restart" ? "restart" : "continue") : null;

      let shading: string | undefined;
      let vAlign: Cell["vAlign"];
      let cellBorders: Borders = {};
      for (const pr of [...layers.map((l) => l.tcPr), tcPr]) {
        if (!pr) continue;
        const shd = child(pr, "w:shd");
        if (shd) shading = hex(attr(shd, "w:fill")) ?? shading;
        const va = attr(child(pr, "w:vAlign"), "w:val");
        if (va) vAlign = va === "center" ? "middle" : va === "bottom" ? "bottom" : "top";
        const tb = readBorders(child(pr, "w:tcBorders"), bNames);
        if (tb) cellBorders = { ...cellBorders, ...tb };
      }

      const lastCol = colIndex === tcs.length - 1;
      const lastRow = rowIndex === trs.length - 1;
      const borders: Borders = {
        top: cellBorders.top !== undefined ? cellBorders.top : rowIndex === 0 ? outer.top : insideH,
        bottom: cellBorders.bottom !== undefined ? cellBorders.bottom : lastRow ? outer.bottom : insideH,
        left: cellBorders.left !== undefined ? cellBorders.left : colIndex === 0 ? outer.left : insideV,
        right: cellBorders.right !== undefined ? cellBorders.right : lastCol ? outer.right : insideV,
      };

      let padding = { ...margin };
      const tcMar = child(tcPr, "w:tcMar");
      if (tcMar) {
        for (const side of ["top", "right", "bottom", "left"] as const) {
          const w = twip(num(child(tcMar, `w:${side}`), "w:w"));
          if (w !== undefined) padding = { ...padding, [side]: w };
        }
      }

      const width = attr(child(tcPr, "w:tcW"), "w:type") === "dxa" ? twip(num(child(tcPr, "w:tcW"), "w:w")) : undefined;
      const cell: Cell = {
        colSpan: span,
        rowSpan: 1,
        width,
        shading,
        vAlign,
        borders,
        padding,
        blocks: readBlocks(elements(tc), ctx, { styleId, conditions }),
      };

      if (vMerge === "continue" && merging.has(gridCol)) {
        merging.get(gridCol)!.rowSpan += 1;
      } else {
        cells.push(cell);
        if (vMerge === "restart") merging.set(gridCol, cell);
        else merging.delete(gridCol);
      }
      gridCol += span;
    });

    const h = num(child(trPr, "w:trHeight"), "w:val");
    rows.push({
      cells,
      header: onOff(child(trPr, "w:tblHeader")) ?? false,
      minHeight: h !== undefined && attr(child(trPr, "w:trHeight"), "w:hRule") !== "auto" ? h / 20 : undefined,
    });
  });

  return {
    t: "table",
    widthPercent: wType === "pct" && wVal ? Math.min(100, wVal / 50) : undefined,
    width: wType === "dxa" && wVal ? wVal / 20 : undefined,
    align: jc === "center" ? "center" : jc === "right" || jc === "end" ? "right" : undefined,
    columns,
    rows,
  };
}

/* -------------------------------------------------------------- paragraphs */

function readParagraph(el: XmlElement, ctx: Context, table: TableEnv | null): Block[] {
  const pPr = child(el, "w:pPr");
  const styleId = attr(child(pPr, "w:pStyle"), "w:val") ?? ctx.defaultParagraphStyle ?? "Normal";
  const chain = styleChain(ctx, styleId);
  const tableLayers = tableStyleLayers(ctx, table);

  const p: PProps = emptyPara();
  applyPPr(p, ctx.docDefaults.pPr);
  for (const l of tableLayers) applyPPr(p, l.pPr);
  for (const s of chain) applyPPr(p, s.pPr);
  applyPPr(p, pPr);

  const base: RunStyle = {};
  applyRPr(base, ctx.docDefaults.rPr, ctx);
  for (const l of tableLayers) applyRPr(base, l.rPr, ctx);
  for (const s of chain) applyRPr(base, s.rPr, ctx);
  const markStyle: RunStyle = { ...base };
  applyRPr(markStyle, child(pPr, "w:rPr"), ctx);

  let list: Paragraph["list"];
  if (p.numId && p.numId !== "0") {
    const levels = ctx.numbering.get(p.numId);
    const level = levels?.get(p.ilvl ?? 0);
    if (level && level.format !== "none") {
      let marker: string;
      if (level.format === "bullet") {
        marker = bulletChar(level.text);
      } else {
        const counts = ctx.counters.get(p.numId) ?? [];
        const lvl = p.ilvl ?? 0;
        counts[lvl] = (counts[lvl] ?? level.start - 1) + 1;
        counts.length = lvl + 1;
        ctx.counters.set(p.numId, counts);
        marker = level.text.replace(/%(\d)/g, (_, d: string) => {
          const i = Number(d) - 1;
          const lv = levels!.get(i);
          return formatNumber(counts[i] ?? lv?.start ?? 1, lv?.format ?? "decimal");
        });
      }
      const markerStyle: RunStyle = { ...markStyle };
      applyRPr(markerStyle, level.rPr, ctx);
      if (markerStyle.font && /symbol|wingdings/i.test(markerStyle.font)) markerStyle.font = markStyle.font;
      const hasOwnIndent = !!child(pPr, "w:ind");
      list = {
        marker,
        indent: hasOwnIndent ? p.indentLeft : level.indent,
        hanging: hasOwnIndent && p.firstLine < 0 ? -p.firstLine : level.hanging,
        markerStyle,
      };
    }
  }

  // Inline content, split at page breaks.
  const out: Block[] = [];
  let content: Inline[] = [];
  const make = (): Paragraph => ({
    t: "p",
    role: roleFor(chain, p.outline),
    styleId,
    style: {
      align: p.align,
      before: p.before,
      after: p.after,
      line: p.line,
      indentLeft: p.indentLeft,
      indentRight: p.indentRight,
      firstLine: p.firstLine,
      shading: p.shading,
      borders: p.borders,
      keepNext: p.keepNext,
    },
    text: markStyle,
    list,
    contextualSpacing: p.contextualSpacing,
    content,
  });

  if (p.pageBreakBefore) out.push({ t: "pagebreak" });
  const state = { field: "none" as "none" | "instr" | "result" };
  const onPageBreak = () => {
    out.push(make());
    out.push({ t: "pagebreak" });
    content = [];
    list = undefined;
  };
  readInlines(elements(el), ctx, base, content, undefined, state, onPageBreak, (c) => (content = c));
  out.push(make());

  // A paragraph that only carried a page break leaves an empty one behind.
  return out.filter((b, i) => !(b.t === "p" && b.content.length === 0 && i < out.length - 1 && out[i + 1]?.t === "pagebreak" && i > 0));
}

function readInlines(
  nodes: XmlElement[],
  ctx: Context,
  base: RunStyle,
  content: Inline[],
  href: string | undefined,
  field: { field: "none" | "instr" | "result" },
  onPageBreak: () => void,
  replace: (c: Inline[]) => void
) {
  let target = content;
  const push = (i: Inline) => target.push(i);
  for (const n of nodes) {
    switch (n.name) {
      case "w:r": {
        const style: RunStyle = { ...base };
        const rPr = child(n, "w:rPr");
        const rStyle = attr(child(rPr, "w:rStyle"), "w:val");
        for (const s of styleChain(ctx, rStyle)) applyRPr(style, s.rPr, ctx);
        applyRPr(style, rPr, ctx);
        for (const c of elements(n)) {
          if (c.name === "w:fldChar") {
            const type = attr(c, "w:fldCharType");
            field.field = type === "begin" ? "instr" : type === "separate" ? "result" : "none";
            continue;
          }
          if (field.field === "instr") continue;
          if (c.name === "w:t") {
            const text = textOf(c);
            if (text) push({ t: "text", text, style, href });
          } else if (c.name === "w:tab" || c.name === "w:ptab") {
            push({ t: "tab" });
          } else if (c.name === "w:br" || c.name === "w:cr") {
            if (attr(c, "w:type") === "page") {
              onPageBreak();
              target = [];
              replace(target);
            } else {
              push({ t: "break" });
            }
          } else if (c.name === "w:noBreakHyphen") {
            push({ t: "text", text: "‑", style, href });
          } else if (c.name === "w:sym") {
            const code = parseInt(attr(c, "w:char") ?? "", 16);
            if (Number.isFinite(code)) push({ t: "text", text: bulletChar(String.fromCodePoint(code)), style, href });
          } else if (c.name === "w:drawing") {
            const img = readDrawing(c, ctx);
            if (img) push(img);
          }
        }
        break;
      }
      case "w:hyperlink": {
        const rel = ctx.rels.get(attr(n, "r:id") ?? "");
        const link = rel?.external && /^(https?:|mailto:)/i.test(rel.target) ? rel.target : href;
        readInlines(elements(n), ctx, base, target, link, field, onPageBreak, (c) => { target = c; replace(c); });
        break;
      }
      case "w:ins":
      case "w:smartTag":
      case "w:fldSimple":
      case "w:customXml":
        readInlines(elements(n), ctx, base, target, href, field, onPageBreak, (c) => { target = c; replace(c); });
        break;
      case "w:sdt":
        readInlines(elements(child(n, "w:sdtContent")), ctx, base, target, href, field, onPageBreak, (c) => { target = c; replace(c); });
        break;
      default:
        break;
    }
  }
}

function readDrawing(el: XmlElement, ctx: Context): Inline | null {
  const holder = child(el, "wp:inline") ?? child(el, "wp:anchor");
  if (!holder) return null;
  const extent = child(holder, "wp:extent");
  const docPr = child(holder, "wp:docPr");
  const blip = findFirst(holder, "a:blip");
  const relId = attr(blip, "r:embed");
  const rel = relId ? ctx.rels.get(relId) : undefined;
  if (!rel || rel.external) return null;
  const emu = (v: number | undefined) => Math.round((v ?? 0) / 9525);
  return {
    t: "image",
    ref: rel.target.replace(/^\/?(word\/)?/, ""),
    width: emu(num(extent, "cx")),
    height: emu(num(extent, "cy")),
    alt: (attr(docPr, "descr") || attr(docPr, "title") || "").trim(),
  };
}

function findFirst(el: XmlElement, name: string): XmlElement | null {
  for (const c of elements(el)) {
    if (c.name === name) return c;
    const f = findFirst(c, name);
    if (f) return f;
  }
  return null;
}

function readBlocks(nodes: XmlElement[], ctx: Context, table: TableEnv | null): Block[] {
  const blocks: Block[] = [];
  for (const n of nodes) {
    if (n.name === "w:p") blocks.push(...readParagraph(n, ctx, table));
    else if (n.name === "w:tbl") blocks.push(readTable(n, ctx));
    else if (n.name === "w:sdt") blocks.push(...readBlocks(elements(child(n, "w:sdtContent")), ctx, table));
  }
  return applyContextualSpacing(blocks);
}

/** Word drops the space between paragraphs of the same style when asked to. */
function applyContextualSpacing(blocks: Block[]): Block[] {
  for (let i = 1; i < blocks.length; i++) {
    const a = blocks[i - 1];
    const b = blocks[i];
    if (a.t === "p" && b.t === "p" && a.styleId === b.styleId) {
      if (a.contextualSpacing) a.style.after = 0;
      if (b.contextualSpacing) b.style.before = 0;
    }
  }
  return blocks;
}

function readRels(xml: string | null | undefined) {
  const rels = new Map<string, { target: string; external: boolean }>();
  if (!xml) return rels;
  for (const r of children(parseXml(xml), "Relationship")) {
    const id = attr(r, "Id");
    const target = attr(r, "Target");
    if (id && target) rels.set(id, { target, external: attr(r, "TargetMode") === "External" });
  }
  return rels;
}

/** Header or footer text, one line per paragraph. */
export function partText(xml: string): string {
  const root = parseXml(xml);
  const lines: string[] = [];
  const walk = (el: XmlElement) => {
    for (const c of elements(el)) {
      if (c.name === "w:p") {
        const t = paragraphText(c).replace(/\s+/g, " ").trim();
        if (t) lines.push(t);
      } else walk(c);
    }
  };
  walk(root);
  return lines.join("\n");
}

function paragraphText(p: XmlElement): string {
  let s = "";
  const walk = (el: XmlElement) => {
    for (const c of elements(el)) {
      if (c.name === "w:t") s += textOf(c);
      else if (c.name === "w:tab") s += " ";
      else if (c.name === "w:instrText") continue;
      else walk(c);
    }
  };
  walk(p);
  return s;
}

/* ------------------------------------------------------------------- entry */

export function convertDocx(parts: DocxParts): DocModel {
  const { styles, defaultParagraphStyle, docDefaults } = readStyles(parts.styles);
  const ctx: Context = {
    styles,
    defaultParagraphStyle,
    docDefaults,
    themeFonts: readTheme(parts.theme),
    numbering: readNumbering(parts.numbering),
    rels: readRels(parts.rels),
    counters: new Map(),
  };
  const doc = parseXml(parts.document);
  const body = child(doc, "w:body");
  const sect = child(body, "w:sectPr");
  const pgSz = child(sect, "w:pgSz");
  const pgMar = child(sect, "w:pgMar");
  const inch = (v: number | undefined, d: number) => (v === undefined ? d : Math.abs(v) / 1440);

  const texts = (list: string[] | undefined) => {
    const all = (list ?? []).map(partText).filter(Boolean);
    return all.length ? [...new Set(all)].join("\n") : null;
  };

  return {
    page: {
      width: inch(num(pgSz, "w:w"), 8.27),
      height: inch(num(pgSz, "w:h"), 11.69),
      margins: {
        top: inch(num(pgMar, "w:top"), 1),
        right: inch(num(pgMar, "w:right"), 1),
        bottom: inch(num(pgMar, "w:bottom"), 1),
        left: inch(num(pgMar, "w:left"), 1),
      },
    },
    blocks: readBlocks(elements(body), ctx, null),
    header: texts(parts.headers),
    footer: texts(parts.footers),
  };
}
