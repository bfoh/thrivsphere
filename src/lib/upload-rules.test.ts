import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildBlobPath,
  buildReceiptPath,
  checkUpload,
  sanitiseFilename,
  MAX_UPLOAD_BYTES,
} from "./upload-rules";

const pdf = { name: "report.pdf", type: "application/pdf", size: 1000 };

describe("checkUpload", () => {
  it("accepts an allowed type with a matching extension", () => {
    assert.deepEqual(checkUpload(pdf), { ok: true });
  });

  it("refuses a type that is not on the allowlist", () => {
    assert.equal(checkUpload({ name: "x.exe", type: "application/x-msdownload", size: 10 }).ok, false);
    assert.equal(checkUpload({ name: "x.sh", type: "application/x-sh", size: 10 }).ok, false);
  });

  it("refuses SVG, which can carry script", () => {
    assert.equal(checkUpload({ name: "logo.svg", type: "image/svg+xml", size: 100 }).ok, false);
  });

  it("refuses a file whose extension contradicts its declared type", () => {
    // An executable renamed to look like a PDF.
    const r = checkUpload({ name: "invoice.exe", type: "application/pdf", size: 100 });
    assert.equal(r.ok, false);
    assert.match((r as { reason: string }).reason, /doesn't match/);
  });

  it("refuses an empty file", () => {
    assert.equal(checkUpload({ ...pdf, size: 0 }).ok, false);
  });

  it("refuses a file over the size limit", () => {
    assert.equal(checkUpload({ ...pdf, size: MAX_UPLOAD_BYTES + 1 }).ok, false);
  });

  it("accepts a file exactly at the limit", () => {
    assert.equal(checkUpload({ ...pdf, size: MAX_UPLOAD_BYTES }).ok, true);
  });

  it("refuses a nameless file", () => {
    assert.equal(checkUpload({ ...pdf, name: "   " }).ok, false);
  });

  it("is case-insensitive about extensions", () => {
    assert.equal(checkUpload({ ...pdf, name: "REPORT.PDF" }).ok, true);
  });
});

describe("buildBlobPath", () => {
  it("keeps files inside the client's folder", () => {
    const p = buildBlobPath("abc-123", "notes.pdf", "u1");
    assert.equal(p, "clients/abc-123/u1.pdf");
  });

  it("does not let a crafted filename escape the folder", () => {
    const p = buildBlobPath("abc-123", "../../../etc/passwd.pdf", "u1");
    assert.ok(!p.includes(".."), "path must not contain traversal");
    assert.ok(p.startsWith("clients/abc-123/"), "path must stay under the client folder");
  });

  it("strips anything odd from the client id", () => {
    const p = buildBlobPath("../evil", "a.pdf", "u1");
    assert.equal(p, "clients/evil/u1.pdf");
  });

  it("never uses the original filename as a path segment", () => {
    const p = buildBlobPath("c1", "my secret diagnosis.pdf", "u1");
    assert.ok(!p.includes("secret"), "storage path must not leak the filename");
  });
});

describe("sanitiseFilename", () => {
  it("removes characters that could inject into a header", () => {
    const s = sanitiseFilename('bad"name\r\nContent-Type: text/html');
    assert.ok(!s.includes('"'));
    assert.ok(!s.includes("\r"));
    assert.ok(!s.includes("\n"));
  });

  it("flattens path separators and traversal", () => {
    assert.ok(!sanitiseFilename("../../etc/passwd").includes(".."));
    assert.ok(!sanitiseFilename("a/b\\c.pdf").match(/[/\\]/));
  });

  it("falls back to a default when nothing usable is left", () => {
    assert.equal(sanitiseFilename('"""'), "document");
  });

  it("truncates a very long name", () => {
    assert.ok(sanitiseFilename("a".repeat(500)).length <= 200);
  });
});

describe("buildReceiptPath", () => {
  it("namespaces receipts away from client documents", () => {
    const path = buildReceiptPath("invoice.pdf", "abc-123");
    assert.equal(path, "expenses/abc-123.pdf");
    assert.ok(!path.startsWith("clients/"));
  });

  it("does not let a filename escape the prefix", () => {
    assert.equal(buildReceiptPath("../../etc/passwd", "a/../b"), "expenses/ab");
    assert.ok(!buildReceiptPath("x.pdf", "../escape").includes(".."));
  });
});
