import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assetUrl, blobPathFor, contentDisposition, parseAssetName, safeDownloadName, servedByRoute, servedInline } from "./assets";

/**
 * The asset route takes a file name straight from the URL and reads it from
 * the same Blob store that holds client documents. These rules are what keep
 * it to library files only.
 */

const HASH = "a".repeat(64);

describe("parseAssetName", () => {
  it("accepts a content hash with a known extension", () => {
    assert.deepEqual(parseAssetName(`${HASH}.webp`), { name: `${HASH}.webp`, ext: "webp" });
    assert.deepEqual(parseAssetName(`${"0f".repeat(16)}.pdf`), { name: `${"0f".repeat(16)}.pdf`, ext: "pdf" });
  });

  it("refuses anything that could reach another path", () => {
    for (const name of [
      `../${HASH}.pdf`,
      `documents/${HASH}.pdf`,
      `${HASH}.pdf/..`,
      `${HASH}%2F.pdf`,
      `${HASH}.PDF`,
      `${HASH}.exe`,
      `${HASH}.svg`,
      `${HASH}`,
      `${HASH}.pdf.pdf`,
      `${"g".repeat(64)}.pdf`,
      `${"a".repeat(31)}.pdf`,
      `${"a".repeat(65)}.pdf`,
      "",
    ]) {
      assert.equal(parseAssetName(name), null, name);
    }
  });

  it("only builds storage paths inside the library folder", () => {
    assert.equal(blobPathFor(`${HASH}.json`), `library/assets/${HASH}.json`);
    assert.throws(() => blobPathFor("../documents/x.pdf"));
  });
});

describe("what the route serves", () => {
  it("never hands out document HTML or JSON directly", () => {
    assert.equal(servedByRoute("html"), false);
    assert.equal(servedByRoute("json"), false);
    for (const ext of ["webp", "png", "jpg", "pdf", "docx", "pptx"] as const) assert.equal(servedByRoute(ext), true, ext);
  });

  it("opens pictures and PDFs in the browser and downloads Office files", () => {
    assert.equal(servedInline("webp"), true);
    assert.equal(servedInline("pdf"), true);
    assert.equal(servedInline("docx"), false);
    assert.equal(servedInline("pptx"), false);
  });
});

describe("download names", () => {
  it("keeps a readable name and sets the extension itself", () => {
    assert.equal(safeDownloadName("Worksheet 5 – Practitioner guide.pdf", "pdf"), "Worksheet 5 – Practitioner guide.pdf");
    assert.equal(safeDownloadName("guide.exe", "docx"), "guide.docx");
  });

  it("removes characters that could break the header", () => {
    const name = safeDownloadName('a"b\r\nContent-Type: text/html;/\\c', "pdf");
    assert.doesNotMatch(name, /["\r\n;/\\:]/);
    assert.match(name, /\.pdf$/);
  });

  it("falls back to a generic name", () => {
    assert.equal(safeDownloadName(null, "pdf"), "ThriveSphere resource.pdf");
    assert.equal(safeDownloadName('"""', "pptx"), "ThriveSphere resource.pptx");
  });

  it("is inline only for a picture or PDF opened without a name", () => {
    assert.equal(contentDisposition("webp", null), "inline");
    assert.equal(contentDisposition("pdf", null), "inline");
    assert.match(contentDisposition("docx", null), /^attachment; /);
    assert.match(contentDisposition("pdf", "Guide"), /^attachment; /);
  });

  it("sends an ASCII name and the full UTF-8 name", () => {
    const header = contentDisposition("pdf", "Worksheet 5 – Guide (print)");
    assert.equal(
      header,
      `attachment; filename="Worksheet 5 - Guide (print).pdf"; filename*=UTF-8''Worksheet%205%20%E2%80%93%20Guide%20%28print%29.pdf`,
    );
    assert.match(header, /^[\x20-\x7e]+$/);
  });

  it("links downloads through the asset route", () => {
    assert.equal(assetUrl(`${HASH}.pdf`), `/api/admin/library/assets/${HASH}.pdf`);
    assert.equal(assetUrl(`${HASH}.pdf`, "Guide & notes"), `/api/admin/library/assets/${HASH}.pdf?download=Guide%20%26%20notes`);
  });
});
