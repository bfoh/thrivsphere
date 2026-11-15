import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { readZip, zipText } from "./zip";
import { convertDocx } from "./docx";
import { fontStack, renderDoc } from "./doc-html";
import { notesText, slideTitle } from "./pptx";
import { parseXml } from "./xml";

/**
 * The library converts the owner's Word and PowerPoint files at build time.
 * These tests use small made-up files: what matters is that nothing in a
 * document can become markup, and that headings and titles are found.
 */

/* ------------------------------------------------------------------ zip */

function makeZip(files: { name: string; data: Buffer; deflate?: boolean }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, "utf8");
    const body = f.deflate ? deflateRawSync(f.data) : f.data;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(f.deflate ? 8 : 0, 8);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(f.deflate ? 8 : 0, 10);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(f.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, body);
    centrals.push(central, name);
    offset += 30 + name.length + body.length;
  }
  const dir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
}

describe("readZip", () => {
  it("reads stored and deflated entries and skips folders", () => {
    const zip = readZip(
      makeZip([
        { name: "word/", data: Buffer.alloc(0) },
        { name: "word/document.xml", data: Buffer.from("<w:document>héllo</w:document>"), deflate: true },
        { name: "media/a.bin", data: Buffer.from([1, 2, 3]) },
      ]),
    );
    assert.deepEqual([...zip.keys()], ["word/document.xml", "media/a.bin"]);
    assert.equal(zipText(zip, "word/document.xml"), "<w:document>héllo</w:document>");
    assert.deepEqual([...zip.get("media/a.bin")!], [1, 2, 3]);
    assert.equal(zipText(zip, "missing.xml"), null);
  });

  it("refuses a file that is not a zip", () => {
    assert.throws(() => readZip(Buffer.from("not a zip at all, just some text to read")), /Not a zip/);
  });

  it("notices a damaged entry", () => {
    const buf = makeZip([{ name: "a.txt", data: Buffer.from("hello") }]);
    // Claim the entry is larger than it is.
    const central = buf.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    buf.writeUInt32LE(99, central + 24);
    assert.throws(() => readZip(buf), /damaged/);
  });
});

/* ----------------------------------------------------------------- docx */

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const para = (text: string, style?: string) =>
  `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;

const STYLES = `<w:styles ${W}>
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="48"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>
</w:styles>`;

const RELS = `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="hyperlink" Target="https://example.org/help" TargetMode="External"/>
  <Relationship Id="rId2" Type="hyperlink" Target="javascript:alert(1)" TargetMode="External"/>
</Relationships>`;

const DOCUMENT = `<w:document ${W}><w:body>
  ${para("ThriveSphere Wellbeing")}
  ${para("My Coping Plan", "Title")}
  ${para("What this is for", "Heading1")}
  ${para("Use &lt;script&gt;alert(1)&lt;/script&gt; &amp; stay \"calm\".")}
  <w:p><w:hyperlink r:id="rId1"><w:r><w:t>Find help</w:t></w:r></w:hyperlink></w:p>
  <w:p><w:hyperlink r:id="rId2"><w:r><w:t>Bad link</w:t></w:r></w:hyperlink></w:p>
  ${para("Closing the session", "Heading1")}
  ${para("Agree one small step.")}
  <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="720" w:bottom="1440" w:left="720"/></w:sectPr>
</w:body></w:document>`;

const FOOTER = `<w:ftr ${W}>${para("© ThriveSphere")}${para("Page 1")}</w:ftr>`;

describe("Word documents", () => {
  const model = convertDocx({ document: DOCUMENT, styles: STYLES, rels: RELS, footers: [FOOTER, FOOTER] });
  const doc = renderDoc(model, { imageSrc: () => null });

  it("reads the page size and margins", () => {
    assert.equal(model.page.width.toFixed(2), "8.27");
    assert.equal(model.page.height.toFixed(2), "11.69");
    assert.deepEqual(model.page.margins, { top: 1, right: 0.5, bottom: 1, left: 0.5 });
  });

  it("reads each footer once", () => {
    assert.equal(model.footer, "© ThriveSphere\nPage 1");
  });

  it("finds the title and sections, leaving out the brand line", () => {
    assert.deepEqual(
      doc.sections.filter((s) => s.title).map((s) => [s.title, s.level]),
      [["My Coping Plan", 0], ["What this is for", 1], ["Closing the session", 1]],
    );
    assert.match(doc.html, /<h2[^>]*>.*My Coping Plan/);
    assert.match(doc.html, /<h3[^>]*id="s\d+"[^>]*>.*What this is for/);
  });

  it("keeps document text as text", () => {
    assert.doesNotMatch(doc.html, /<script/i);
    assert.match(doc.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; stay &quot;calm&quot;\./);
  });

  it("links only to web and email addresses", () => {
    assert.match(doc.html, /<a href="https:\/\/example\.org\/help" target="_blank" rel="noopener noreferrer">/);
    assert.doesNotMatch(doc.html, /javascript:/);
    assert.match(doc.html, /Bad link/);
  });

  it("indexes the words under their section", () => {
    const close = doc.sections.find((s) => s.title === "Closing the session");
    assert.match(close?.text ?? "", /Agree one small step\./);
    assert.ok(doc.words > 10);
  });
});

describe("fontStack", () => {
  it("falls back to Carlito for Calibri, which has the same metrics", () => {
    assert.equal(fontStack("Calibri"), "'Calibri', 'Carlito', Aptos, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif");
  });

  it("uses single quotes and strips anything that could leave the style attribute", () => {
    const stack = fontStack(`Evil"; background:url(x) '`);
    assert.doesNotMatch(stack, /["();:]/);
    assert.ok(stack.startsWith("'Evil backgroundurlx'"));
  });

  it("picks a serif fallback for serif fonts", () => {
    assert.match(fontStack("Cambria"), /serif$/);
    assert.doesNotMatch(fontStack("Cambria"), /sans-serif/);
    assert.match(fontStack(), /^Aptos/);
  });
});

/* ----------------------------------------------------------------- pptx */

describe("slide titles", () => {
  it("takes the title the speaker notes give", () => {
    assert.equal(slideTitle([{ text: "Something else", size: 40 }], "SLIDE 3: Noticing the urge\nExplain: …"), "Noticing the urge");
  });

  it("otherwise takes the largest line, skipping brand, copyright and page numbers", () => {
    assert.equal(
      slideTitle([
        { text: "ThriveSphere Wellbeing", size: 44 },
        { text: "© 2026 ThriveSphere", size: 50 },
        { text: "3 / 12", size: 60 },
        { text: "Pause before you act", size: 36 },
        { text: "Breathe in for four", size: 20 },
      ]),
      "Pause before you act",
    );
    assert.equal(slideTitle([{ text: "ok", size: 40 }]), null);
  });

  it("reads speaker notes from the notes body only", () => {
    const P = 'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
    const shape = (type: string, lines: string[]) =>
      `<p:sp><p:nvSpPr><p:cNvPr id="1" name="x"/><p:cNvSpPr/><p:nvPr><p:ph type="${type}"/></p:nvPr></p:nvSpPr><p:txBody>${lines
        .map((l) => `<a:p><a:r><a:t>${l}</a:t></a:r></a:p>`)
        .join("")}</p:txBody></p:sp>`;
    const notes = parseXml(
      `<p:notes ${P}><p:cSld><p:spTree>${shape("sldImg", ["image"])}${shape("body", ["EXPLAIN: what the scale means", "", "ASK: where are you now?"])}${shape("sldNum", ["4"])}</p:spTree></p:cSld></p:notes>`,
    );
    assert.equal(notesText(notes), "EXPLAIN: what the scale means\n\nASK: where are you now?");
  });
});
