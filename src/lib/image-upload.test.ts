import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { imageSize, matchesSignature } from "./image-upload";

const emblem = new Uint8Array(readFileSync(join(process.cwd(), "public/images/emblem.png")));

/** A minimal JPEG header: SOI, an APP0 segment, then SOF0 for 640 × 480. */
const jpeg = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0xe0, 0x02, 0x80, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
]);

/** A WebP (VP8X) header for 1080 × 1350. */
const webp = (() => {
  const b = new Uint8Array(30);
  b.set([..."RIFF"].map((c) => c.charCodeAt(0)), 0);
  b.set([..."WEBP"].map((c) => c.charCodeAt(0)), 8);
  b.set([..."VP8X"].map((c) => c.charCodeAt(0)), 12);
  const w = 1080 - 1;
  const h = 1350 - 1;
  b.set([w & 255, (w >> 8) & 255, w >> 16, h & 255, (h >> 8) & 255, h >> 16], 24);
  return b;
})();

describe("image checks", () => {
  it("recognise real files and refuse disguised ones", () => {
    assert.equal(matchesSignature("image/png", emblem), true);
    assert.equal(matchesSignature("image/jpeg", emblem), false);
    assert.equal(matchesSignature("image/jpeg", jpeg), true);
    assert.equal(matchesSignature("image/webp", webp), true);
    assert.equal(matchesSignature("image/gif", emblem), false);
  });

  it("read the pixel size from the header", () => {
    assert.deepEqual(imageSize("image/png", emblem), { width: 256, height: 256 });
    assert.deepEqual(imageSize("image/jpeg", jpeg), { width: 640, height: 480 });
    assert.deepEqual(imageSize("image/webp", webp), { width: 1080, height: 1350 });
    assert.equal(imageSize("image/png", new Uint8Array(8)), null);
  });
});
