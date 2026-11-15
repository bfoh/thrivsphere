/**
 * Builds the resource library from the owner's files in `resources/`.
 *
 *   npm run library:build
 *
 * macOS only: it uses Quick Look to draw PowerPoint slides, PDFKit (through a
 * small Swift tool it compiles) to read PDFs, and the installed Google Chrome
 * to print documents and photograph slides. Nothing is uploaded; see
 * `upload.ts` for that, and docs/library.md for the whole process.
 *
 * Output, in `library-build/` (git-ignored, because it is the owner's content):
 *   assets/          every file, named `<sha256>.<ext>`
 *   manifest.txt     the name of the manifest asset
 *   upload.json      the assets the manifest uses, for the upload step
 *   report.md        what was built, with anything that needs a person's eye
 */
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import {
  COLLECTIONS,
  IGNORED_FILES,
  SERIES,
  collectionLabel,
  kindMeta,
  materialTitle,
  type CatalogueCollection,
  type CatalogueMaterial,
  type MaterialKind,
} from "../../src/lib/library/catalogue";
import { assetUrl, type AssetExtension } from "../../src/lib/library/assets";
import type {
  DocumentMaterial,
  LibraryCollection,
  LibraryManifest,
  LibraryMaterial,
  PagesMaterial,
  SearchEntry,
  SearchIndex,
  SlidesMaterial,
} from "../../src/lib/library/types";
import { readZip, zipText, type ZipEntries } from "../../src/lib/library/convert/zip";
import { convertDocx, type Block, type DocModel } from "../../src/lib/library/convert/docx";
import { printDocumentHtml, renderDoc } from "../../src/lib/library/convert/doc-html";
import { readDeck, renderSlideHtml, SLIDE_WIDTH_PX, type Deck } from "../../src/lib/library/convert/pptx";
import { launchChrome, type Page } from "./cdp";

const ROOT = resolve(__dirname, "../..");
const SOURCE = join(ROOT, "resources");
const OUT = join(ROOT, "library-build");
const ASSETS = join(OUT, "assets");
const WORK = join(OUT, "work");
const BIN = join(OUT, "bin");
const FONTS = join(OUT, "fonts");

const report: string[] = [];
const warnings: string[] = [];
const warn = (msg: string) => {
  warnings.push(msg);
  console.warn(`  ! ${msg}`);
};

/* ------------------------------------------------------------------ assets */

const used = new Set<string>();

function store(buf: Buffer, ext: AssetExtension): string {
  const name = `${createHash("sha256").update(buf).digest("hex")}.${ext}`;
  const file = join(ASSETS, name);
  if (!existsSync(file)) writeFileSync(file, buf);
  used.add(name);
  return name;
}

const assetPath = (name: string) => join(ASSETS, name);
const fileUrl = (path: string) => pathToFileURL(path).href;

type Picture = { asset: string; print: string };

/**
 * Pictures from documents: WebP for the screen, at most 1600px wide and
 * lossless where that is smaller; and a copy for printing, JPEG unless the
 * picture is transparent, because Chrome puts a JPEG into a PDF as it is
 * but turns anything else into a much larger uncompressed bitmap.
 */
const imageCache = new Map<string, Picture>();
async function storeImage(buf: Buffer): Promise<Picture | null> {
  const key = createHash("sha256").update(buf).digest("hex");
  const hit = imageCache.get(key);
  if (hit) return hit;
  try {
    const meta = await sharp(buf, { failOn: "none" }).metadata();
    const resized = () => sharp(buf, { failOn: "none" }).rotate().resize({ width: Math.min(meta.width ?? 1600, 1600), withoutEnlargement: true });
    const lossy = await resized().webp({ quality: 86 }).toBuffer();
    let out = lossy;
    if (meta.format === "png") {
      const lossless = await resized().webp({ lossless: true }).toBuffer();
      if (lossless.length <= lossy.length * 1.5) out = lossless;
    }
    const { isOpaque } = await sharp(buf, { failOn: "none" }).stats();
    const dir = join(WORK, "print-images");
    mkdirSync(dir, { recursive: true });
    const print = join(dir, `${key}.${isOpaque ? "jpg" : "png"}`);
    writeFileSync(print, isOpaque ? await resized().jpeg({ quality: 88, mozjpeg: true }).toBuffer() : await resized().png({ compressionLevel: 9 }).toBuffer());
    const picture = { asset: store(out, "webp"), print };
    imageCache.set(key, picture);
    return picture;
  } catch (err) {
    warn(`a picture could not be converted (${(err as Error).message})`);
    return null;
  }
}

async function webp(png: Buffer | string, width: number | null, quality: number): Promise<string> {
  let img = sharp(png);
  if (width) img = img.resize({ width, withoutEnlargement: true });
  return store(await img.webp({ quality }).toBuffer(), "webp");
}

/* ------------------------------------------------------------------- tools */

function pdftool(): string {
  const bin = join(BIN, "pdftool");
  const src = join(__dirname, "pdftool.swift");
  if (!existsSync(bin) || statSync(bin).mtimeMs < statSync(src).mtimeMs) {
    mkdirSync(BIN, { recursive: true });
    console.log("Compiling pdftool…");
    execFileSync("swiftc", ["-O", "-o", bin, src], { stdio: "inherit" });
  }
  return bin;
}

type PdfPage = { page: number; file: string; width: number; height: number; text: string };

function renderPdf(tool: string, pdf: string, dir: string, width: number): PdfPage[] {
  mkdirSync(dir, { recursive: true });
  const out = execFileSync(tool, ["render", pdf, dir, String(width)], { maxBuffer: 1 << 28 }).toString();
  return out
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const p = JSON.parse(l) as PdfPage;
      return { ...p, file: join(dir, p.file) };
    });
}

/**
 * Fonts for drawing. The owner's files use Aptos and Calibri, which this Mac
 * does not have: Calibri is replaced by Carlito, which has identical metrics
 * so lines break where they do in Office; Aptos by Helvetica Neue.
 */
async function fontCss(): Promise<string> {
  mkdirSync(FONTS, { recursive: true });
  const cssFile = join(FONTS, "carlito.css");
  if (!existsSync(cssFile)) {
    console.log("Downloading Carlito (Calibri-compatible metrics)…");
    const res = await fetch("https://fonts.googleapis.com/css2?family=Carlito:ital,wght@0,400;0,700;1,400;1,700", {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" },
    });
    if (!res.ok) throw new Error(`Google Fonts returned ${res.status}`);
    const css = await res.text();
    let local = "";
    for (const block of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
      const url = block.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
      const range = block.match(/unicode-range:\s*([^;]+);/)?.[1] ?? "";
      if (!url || !/U\+0000-00FF|U\+0100-02BA/i.test(range)) continue; // latin and latin-ext
      const file = join(FONTS, basename(new URL(url).pathname));
      if (!existsSync(file)) writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer()));
      local += block.replace(url, fileUrl(file)) + "\n";
    }
    if (!local) throw new Error("No Carlito faces found");
    writeFileSync(cssFile, local);
  }
  const carlito = readFileSync(cssFile, "utf8");
  const faces = (family: string, real: Record<string, string>) =>
    Object.entries(real)
      .map(([k, ps]) => {
        const [weight, style] = k.split("/");
        return `@font-face{font-family:"${family}";src:local("${ps}");font-weight:${weight};font-style:${style}}`;
      })
      .join("\n");
  const helvetica = { "400/normal": "HelveticaNeue", "700/normal": "HelveticaNeue-Bold", "400/italic": "HelveticaNeue-Italic", "700/italic": "HelveticaNeue-BoldItalic" };
  const georgia = { "400/normal": "Georgia", "700/normal": "Georgia-Bold", "400/italic": "Georgia-Italic", "700/italic": "Georgia-BoldItalic" };
  return [
    carlito,
    carlito.replace(/font-family:\s*'Carlito'/g, "font-family: 'Calibri'"),
    carlito.replace(/font-family:\s*'Carlito'/g, "font-family: 'Calibri Light'"),
    ...["Aptos", "Aptos Display", "Aptos Narrow", "Segoe UI"].map((f) => faces(f, helvetica)),
    faces("Cambria", georgia),
  ].join("\n");
}

/* ---------------------------------------------------------------- printing */

const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function printPdf(page: Page, htmlFile: string, opts: Record<string, unknown>): Promise<Buffer> {
  await page.goto(fileUrl(htmlFile));
  const { data } = await page.call<{ data: string }>("Page.printToPDF", {
    printBackground: true,
    preferCSSPageSize: true,
    ...opts,
  });
  return Buffer.from(data, "base64");
}

/** Header and footer lines as Word places them, in the page margins. */
function marginTemplate(text: string | null, where: "header" | "footer", margins: DocModel["page"]["margins"]) {
  if (!text) return "<span></span>";
  const lines = text.split("\n").map(escHtml).join("<br>");
  const pad = where === "header" ? "padding-top:0.35in" : "padding-bottom:0.35in";
  return `<div style="width:100%;box-sizing:border-box;padding-left:${margins.left}in;padding-right:${margins.right}in;${pad};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:7.5pt;color:#555;text-align:${where === "header" ? "right" : "center"};-webkit-print-color-adjust:exact">${lines}</div>`;
}

/* --------------------------------------------------------------- materials */

type Built = { material: LibraryMaterial; entries: SearchEntry[]; texts: { title: string; text: string }[] };

type Ctx = { page: Page; slidePage: Page; fonts: string; pdftool: string };

const KIND_WORDS: Record<MaterialKind, string> = {
  "practitioner-guide": "practitioner guide delivery guide session plan facilitator notes prepare",
  presentation: "teaching presentation slides slide deck powerpoint pptx teach",
  "learning-guide": "client learning guide information handout explain",
  "activity-worksheet": "client activity worksheet exercise practise practice handout",
  "review-form": "review form agreed support initial assessment record",
};

function downloadName(col: CatalogueCollection, mat: CatalogueMaterial, ext: string) {
  const lead = collectionLabel(col) ?? col.title;
  return `ThriveSphere ${lead} – ${materialTitle(mat)}.${ext}`;
}

function images(blocks: Block[], out = new Set<string>()): Set<string> {
  for (const b of blocks) {
    if (b.t === "p") for (const i of b.content) if (i.t === "image") out.add(i.ref);
    if (b.t === "table") for (const r of b.rows) for (const c of r.cells) images(c.blocks, out);
  }
  return out;
}

async function buildDocument(ctx: Ctx, col: CatalogueCollection, mat: CatalogueMaterial, file: string, work: string): Promise<Built> {
  const buf = readFileSync(file);
  const zip = readZip(buf);
  const names = [...zip.keys()];
  const model = convertDocx({
    document: zipText(zip, "word/document.xml") ?? "",
    styles: zipText(zip, "word/styles.xml"),
    numbering: zipText(zip, "word/numbering.xml"),
    theme: zipText(zip, "word/theme/theme1.xml"),
    rels: zipText(zip, "word/_rels/document.xml.rels"),
    headers: names.filter((n) => /^word\/header\d*\.xml$/.test(n)).map((n) => zipText(zip, n)!),
    footers: names.filter((n) => /^word\/footer\d*\.xml$/.test(n)).map((n) => zipText(zip, n)!),
  });

  const pictures = new Map<string, Picture>();
  for (const ref of images(model.blocks)) {
    const data = zip.get(`word/${ref}`);
    const picture = data ? await storeImage(data) : null;
    if (picture) pictures.set(ref, picture);
    else warn(`${basename(file)}: picture ${ref} is missing from the file`);
  }

  const title = materialTitle(mat);
  const web = renderDoc(model, { imageSrc: (ref) => (pictures.has(ref) ? assetUrl(pictures.get(ref)!.asset) : null) });
  const print = renderDoc(model, { imageSrc: (ref) => (pictures.has(ref) ? fileUrl(pictures.get(ref)!.print) : null) });

  const htmlFile = join(work, "print.html");
  writeFileSync(htmlFile, printDocumentHtml(print.html, model, `${col.title} – ${title}`, `<style>${ctx.fonts}</style>`));
  const m = model.page.margins;
  const pdf = await printPdf(ctx.page, htmlFile, {
    displayHeaderFooter: !!(model.header || model.footer),
    headerTemplate: marginTemplate(model.header, "header", m),
    footerTemplate: marginTemplate(model.footer, "footer", m),
  });
  const pdfName = store(pdf, "pdf");
  const pages = renderPdf(ctx.pdftool, assetPath(pdfName), join(work, "pages"), 900);

  const sections = web.sections.filter((s) => s.title).map((s) => ({ id: s.id, title: s.title, level: s.level }));
  const material: DocumentMaterial = {
    format: "document",
    id: mat.id,
    kind: mat.kind,
    title,
    subtitle: mat.subtitle ?? null,
    original: { asset: store(buf, "docx"), name: basename(file), bytes: buf.length },
    pdf: { asset: pdfName, name: downloadName(col, mat, "pdf"), bytes: pdf.length },
    pageCount: pages.length,
    cover: await webp(pages[0].file, 560, 82),
    words: web.words,
    html: store(Buffer.from(web.html, "utf8"), "html"),
    sections,
    header: model.header,
    footer: model.footer,
    columnInches: model.page.width - m.left - m.right,
  };

  const entries: SearchEntry[] = web.sections
    .filter((s) => s.text.trim())
    .map((s) => ({ c: col.slug, m: mat.id, at: s.id, label: s.title || null, text: s.text }));
  report.push(`- ${title}: ${pages.length} pages, ${web.words} words, ${sections.filter((s) => s.level > 0).length} sections, ${pictures.size} pictures`);
  return { material, entries, texts: web.sections.map((s) => ({ title: s.title, text: s.text })) };
}

async function photographSlides(page: Page, url: string, expected: number): Promise<Buffer[] | null> {
  await page.call("Emulation.setDeviceMetricsOverride", { width: SLIDE_WIDTH_PX, height: 540, deviceScaleFactor: 2, mobile: false });
  await page.goto(url);
  const rects = await page.eval<{ x: number; y: number; w: number; h: number }[]>(
    `[...document.querySelectorAll("div.slide")].map((e) => { const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; })`
  );
  if (rects.length !== expected) return null;
  const shots: Buffer[] = [];
  for (const r of rects) {
    const { data } = await page.call<{ data: string }>("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 },
    });
    shots.push(Buffer.from(data, "base64"));
  }
  return shots;
}

/** Quick Look's rendering of a deck, or null where Quick Look cannot open it. */
async function quickLookSlides(ctx: Ctx, file: string, work: string, expected: number): Promise<Buffer[] | null> {
  const out = join(work, "ql");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  spawnSync("qlmanage", ["-p", "-o", out, file], { stdio: "ignore", timeout: 180_000 });
  const dir = join(out, `${basename(file)}.qlpreview`);
  const preview = join(dir, "Preview.html");
  if (!existsSync(preview)) return null;

  let html = readFileSync(preview, "utf8");
  // Quick Look keeps pictures as one-page PDFs, which Chrome cannot show inline.
  for (const f of readdirSync(dir)) {
    if (!/^Attachment\d+\.pdf$/.test(f)) continue;
    const png = f.replace(/\.pdf$/, ".png");
    execFileSync(ctx.pdftool, ["raster", join(dir, f), join(dir, png), "3"]);
    html = html.split(`src="${f}"`).join(`src="${png}"`);
  }
  html = html.replace(
    "</head>",
    `<style>${ctx.fonts}
body{background:#fff!important;margin:0!important}
div.slide{margin:0!important;-webkit-box-shadow:none!important;box-shadow:none!important}
div.loading-slide{display:none!important}</style></head>`
  );
  const page = join(dir, "render.html");
  writeFileSync(page, html);
  return photographSlides(ctx.slidePage, fileUrl(page), expected);
}

/** Draws the slides from the deck's own XML, for decks Quick Look cannot open. */
async function fallbackSlides(ctx: Ctx, deck: Deck, zip: ZipEntries, work: string, file: string): Promise<Buffer[]> {
  const media = join(work, "media");
  mkdirSync(media, { recursive: true });
  const problems = new Set<string>();
  const slides = deck.slides.map((_, i) => {
    const r = renderSlideHtml(deck, i, (part) => {
      const data = zip.get(part);
      if (!data) return null;
      const out = join(media, part.replace(/[^A-Za-z0-9._-]/g, "_"));
      writeFileSync(out, data);
      return fileUrl(out);
    });
    r.warnings.forEach((w) => problems.add(w));
    return r.html;
  });
  for (const p of problems) warn(`${basename(file)}: ${p}`);
  const page = join(work, "fallback.html");
  writeFileSync(page, `<!doctype html><html><head><meta charset="utf-8"><style>${ctx.fonts}\nbody{margin:0;background:#fff}</style></head><body>${slides.join("")}</body></html>`);
  const shots = await photographSlides(ctx.slidePage, fileUrl(page), deck.slides.length);
  if (!shots) throw new Error(`${basename(file)}: the slides could not be drawn`);
  return shots;
}

async function buildSlides(ctx: Ctx, col: CatalogueCollection, mat: CatalogueMaterial, file: string, work: string): Promise<Built> {
  const buf = readFileSync(file);
  const zip = readZip(buf);
  const deck = readDeck(zip);
  let shots = await quickLookSlides(ctx, file, work, deck.slides.length);
  let drawnBy = "Quick Look";
  if (!shots) {
    drawnBy = "the library's own slide renderer (Quick Look could not open this deck)";
    warn(`${basename(file)}: Quick Look could not open this deck; drawn from its XML instead`);
    shots = await fallbackSlides(ctx, deck, zip, work, file);
  }

  const slides = [];
  const jpegs: string[] = [];
  for (const [i, png] of shots.entries()) {
    slides.push({
      image: await webp(png, null, 84),
      thumb: await webp(png, 400, 76),
      title: deck.slides[i].title,
      notes: deck.slides[i].notes,
    });
    const jpg = join(work, `slide-${i + 1}.jpg`);
    writeFileSync(jpg, await sharp(png).jpeg({ quality: 86, mozjpeg: true }).toBuffer());
    jpegs.push(jpg);
  }

  // A PDF of the slides, one per page, for printing or sharing.
  const w = deck.width / 914400;
  const h = deck.height / 914400;
  const deckHtml = join(work, "deck.html");
  writeFileSync(
    deckHtml,
    `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${w}in ${h}in;margin:0}html,body{margin:0}img{display:block;width:${w}in;height:${h}in;break-after:page}</style></head><body>${jpegs
      .map((j) => `<img src="${fileUrl(j)}">`)
      .join("")}</body></html>`
  );
  const pdf = await printPdf(ctx.page, deckHtml, {});

  const title = materialTitle(mat);
  const words = deck.slides.reduce((n, s) => n + (s.text.match(/\S+/g)?.length ?? 0), 0);
  const material: SlidesMaterial = {
    format: "slides",
    id: mat.id,
    kind: mat.kind,
    title,
    subtitle: mat.subtitle ?? null,
    original: { asset: store(buf, "pptx"), name: basename(file), bytes: buf.length },
    pdf: { asset: store(pdf, "pdf"), name: downloadName(col, mat, "pdf"), bytes: pdf.length },
    pageCount: slides.length,
    cover: await webp(shots[0], 640, 80),
    words,
    slides,
    aspect: deck.width / deck.height,
  };
  const entries: SearchEntry[] = deck.slides.map((s, i) => ({
    c: col.slug,
    m: mat.id,
    at: `slide-${i + 1}`,
    label: `Slide ${i + 1}${s.title ? ` · ${s.title}` : ""}`,
    text: [s.text, s.notes].filter(Boolean).join("\n"),
  }));
  const withNotes = deck.slides.filter((s) => s.notes).length;
  report.push(`- ${title}: ${slides.length} slides${withNotes ? `, speaker notes on ${withNotes}` : ""}, drawn by ${drawnBy}`);
  return { material, entries, texts: deck.slides.map((s) => ({ title: s.title ?? "", text: s.text })) };
}

async function buildPages(ctx: Ctx, col: CatalogueCollection, mat: CatalogueMaterial, file: string, work: string): Promise<Built> {
  const buf = readFileSync(file);
  const rendered = renderPdf(ctx.pdftool, file, join(work, "pages"), 1700);
  const pages = [];
  for (const p of rendered) pages.push({ image: await webp(p.file, null, 86), thumb: await webp(p.file, 360, 76) });
  const asset = store(buf, "pdf");
  const title = materialTitle(mat);
  const material: PagesMaterial = {
    format: "pages",
    id: mat.id,
    kind: mat.kind,
    title,
    subtitle: mat.subtitle ?? null,
    original: { asset, name: basename(file), bytes: buf.length },
    pdf: { asset, name: downloadName(col, mat, "pdf"), bytes: buf.length },
    pageCount: pages.length,
    cover: await webp(rendered[0].file, 560, 82),
    words: rendered.reduce((n, p) => n + (p.text.match(/\S+/g)?.length ?? 0), 0),
    pages,
    aspect: rendered[0].width / rendered[0].height,
  };
  const entries: SearchEntry[] = rendered.map((p) => ({ c: col.slug, m: mat.id, at: `page-${p.page}`, label: `Page ${p.page}`, text: p.text }));
  report.push(`- ${title}: ${pages.length} pages (PDF)`);
  // Short lines naming an aim or purpose, with the text that follows them.
  const lines = rendered.flatMap((p) => p.text.split("\n").map((l) => l.trim()).filter(Boolean));
  const texts = lines.flatMap((l, i) =>
    /\b(aim|purpose)\b/i.test(l) && l.length <= 70 ? [{ title: l, text: [l, ...lines.slice(i + 1, i + 8)].join("\n") }] : []
  );
  return { material, entries, texts };
}

/* ----------------------------------------------------------------- summary */

const LABELLED_AIM = /^(?:session aim|learning aim|aim|purpose(?: and scope)?|your focus|your goal)\b(\s*[:—–-]\s*|\s+)(.{30,})$/i;

/** Sentences up to about 300 characters, without a trailing page or list number. */
function firstSentences(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const sentences = flat.match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? [flat];
  let out = "";
  for (const s of sentences) {
    if ((out + s).length > 300 && out) break;
    out += s;
  }
  return (out || flat).trim().replace(/\s+\d+\.?$/, "");
}

/** An aim stated under its own heading: prose, or the list of bullets that opens it. */
function aimSection(t: { title: string; text: string }): string | null {
  if (!/\b(aim|purpose)\b/i.test(t.title) || t.title.length > 70) return null;
  const lines = t.text.split("\n").map((l) => l.trim()).filter(Boolean);
  const body = lines[0]?.replace(/\s+/g, " ") === t.title.replace(/\s+/g, " ") ? lines.slice(1) : lines;
  if (!body.length) return null;
  if (body[0].startsWith("•")) {
    const bullets: string[] = [];
    for (const l of body) {
      if (!l.startsWith("•")) break;
      bullets.push(`• ${l.replace(/^•\s*/, "")}`);
      if (bullets.length === 6) break;
    }
    return bullets.join("\n");
  }
  const prose = firstSentences(body.join(" "));
  return prose.length >= 40 ? prose : null;
}

/** An aim given as a labelled line: "YOUR FOCUS Notice…", "Purpose and scope A 50-minute…". */
function labelledAim(t: { text: string }): string | null {
  for (const line of t.text.split("\n")) {
    const m = line.trim().match(LABELLED_AIM);
    // After a bare space the aim must start a sentence, so "Purpose and materials Use…" is not read as one.
    if (m && (m[1].trim() || /^\p{Lu}/u.test(m[2]))) return firstSentences(m[2]);
  }
  return null;
}

/**
 * The resource's own statement of its aim: a heading that names it first,
 * then a labelled line, looking in the practitioner guide before the others.
 */
function findSummary(docs: { title: string; text: string }[][]): string | null {
  for (const rule of [aimSection, labelledAim]) {
    for (const texts of docs) {
      for (const t of texts) {
        const found = rule(t);
        if (found) return found;
      }
    }
  }
  return null;
}

/* -------------------------------------------------------------------- main */

async function main() {
  if (process.platform !== "darwin") throw new Error("The library build runs on macOS (it uses Quick Look and PDFKit).");
  if (!existsSync(SOURCE)) throw new Error(`Put the owner's files in ${SOURCE} first.`);
  mkdirSync(ASSETS, { recursive: true });
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });

  // Every file must be catalogued or deliberately ignored.
  const files = readdirSync(SOURCE).filter((f) => !f.startsWith("."));
  const catalogued = new Set(COLLECTIONS.flatMap((c) => c.materials.map((m) => m.file)));
  for (const f of files) if (!catalogued.has(f) && !IGNORED_FILES[f]) warn(`${f} is in resources/ but not in the catalogue, so it was left out`);
  for (const f of catalogued) if (!files.includes(f)) throw new Error(`The catalogue lists ${f}, which is not in resources/`);

  const tool = pdftool();
  const fonts = await fontCss();
  const browser = await launchChrome();
  const ctx: Ctx = { page: await browser.newPage(), slidePage: await browser.newPage(), fonts, pdftool: tool };

  const collections: LibraryCollection[] = [];
  const entries: SearchEntry[] = [];
  try {
    for (const col of COLLECTIONS) {
      const label = collectionLabel(col);
      console.log(`\n${label ?? col.title}`);
      report.push(`\n### ${label ? `${label}: ` : ""}${col.title}`);
      const materials: LibraryMaterial[] = [];
      const texts: { kind: MaterialKind; texts: Built["texts"] }[] = [];
      for (const mat of col.materials) {
        const file = join(SOURCE, mat.file);
        const work = join(WORK, col.slug, mat.id);
        mkdirSync(work, { recursive: true });
        console.log(`  ${materialTitle(mat)}  ← ${mat.file}`);
        const ext = extname(mat.file).toLowerCase();
        const built =
          ext === ".docx"
            ? await buildDocument(ctx, col, mat, file, work)
            : ext === ".pptx"
              ? await buildSlides(ctx, col, mat, file, work)
              : ext === ".pdf"
                ? await buildPages(ctx, col, mat, file, work)
                : null;
        if (!built) throw new Error(`Unsupported file type: ${mat.file}`);
        materials.push(built.material);
        entries.push(...built.entries);
        texts.push({ kind: mat.kind, texts: built.texts });
        const kind = kindMeta(mat.kind);
        entries.push({
          c: col.slug,
          m: mat.id,
          at: null,
          label: null,
          text: [built.material.title, built.material.subtitle, kind.label, kind.step, KIND_WORDS[mat.kind], mat.file.replace(/[_.-]+/g, " ")]
            .filter(Boolean)
            .join(" "),
        });
      }

      // The aim, as the practitioner guide states it, else the learning guide.
      const order: MaterialKind[] = ["practitioner-guide", "learning-guide", "presentation", "activity-worksheet", "review-form"];
      const summary = findSummary(order.flatMap((k) => texts.filter((t) => t.kind === k).map((t) => t.texts)));
      report.push(summary ? `\n> ${summary}` : "\n> (no aim statement found; the series description is shown instead)");

      const deck = materials.find((m) => m.format === "slides");
      const series = SERIES.find((s) => s.key === col.series)!;
      collections.push({
        slug: col.slug,
        series: col.series,
        number: col.number,
        label,
        title: col.title,
        aliases: col.aliases ?? [],
        summary,
        cover: (deck ?? materials[0]).cover,
        materials,
        onlineWorksheetKey: col.onlineWorksheetKey ?? null,
      });
      entries.push({
        c: col.slug,
        m: null,
        at: null,
        label: null,
        text: [label, col.title, ...(col.aliases ?? []), series.title, series.unit, col.series === "act" ? "acceptance and commitment therapy" : null, summary]
          .filter(Boolean)
          .join(" "),
      });
    }
  } finally {
    await browser.close();
  }

  const index: SearchIndex = { version: 1, entries };
  const manifest: LibraryManifest = {
    version: 1,
    builtAt: new Date().toISOString(),
    series: SERIES,
    collections,
    search: store(Buffer.from(JSON.stringify(index)), "json"),
  };
  const manifestName = store(Buffer.from(JSON.stringify(manifest)), "json");
  writeFileSync(join(OUT, "manifest.txt"), manifestName + "\n");
  writeFileSync(join(OUT, "upload.json"), JSON.stringify([...used].sort(), null, 2));

  const bytes = [...used].reduce((n, a) => n + statSync(assetPath(a)).size, 0);
  const header = [
    `# Library build — ${manifest.builtAt}`,
    "",
    `Manifest: \`${manifestName}\``,
    `${collections.length} resources, ${collections.reduce((n, c) => n + c.materials.length, 0)} materials, ${used.size} files, ${(bytes / 1048576).toFixed(1)} MB`,
    "",
    warnings.length ? `## Needs attention\n\n${warnings.map((w) => `- ${w}`).join("\n")}` : "Nothing needs attention.",
    "",
    "## Built",
  ];
  writeFileSync(join(OUT, "report.md"), [...header, ...report].join("\n") + "\n");
  console.log(`\nDone: ${manifestName}\n${used.size} files, ${(bytes / 1048576).toFixed(1)} MB. See library-build/report.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
