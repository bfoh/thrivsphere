/**
 * Checking uploaded images without an image library.
 *
 * The browser says what type a file is; the first bytes say what it really
 * is. Pixel size is read from the file's header, so nothing needs decoding.
 * Pure, so it can be tested on its own.
 */

export const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.slice(from, to));

const SIGNATURES: Record<string, (b: Uint8Array) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/webp": (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP",
};

/** True when the bytes really are the type claimed. */
export function matchesSignature(type: string, bytes: Uint8Array): boolean {
  return SIGNATURES[type]?.(bytes) ?? false;
}

export type ImageSize = { width: number; height: number };

/** Width and height from a PNG, JPEG or WebP header, or null if unreadable. */
export function imageSize(type: string, b: Uint8Array): ImageSize | null {
  try {
    if (type === "image/png") {
      if (ascii(b, 12, 16) !== "IHDR") return null;
      const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
      return ok(v.getUint32(16), v.getUint32(20));
    }
    if (type === "image/jpeg") {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) {
          i++;
          continue;
        }
        const marker = b[i + 1];
        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
          i += 2;
          continue;
        }
        const length = (b[i + 2] << 8) | b[i + 3];
        // Start-of-frame markers carry the size; C4, C8 and CC are other tables.
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return ok((b[i + 7] << 8) | b[i + 8], (b[i + 5] << 8) | b[i + 6]);
        }
        i += 2 + length;
      }
      return null;
    }
    if (type === "image/webp") {
      const chunk = ascii(b, 12, 16);
      if (chunk === "VP8 ") return ok(((b[27] << 8) | b[26]) & 0x3fff, ((b[29] << 8) | b[28]) & 0x3fff);
      if (chunk === "VP8L") {
        const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
        return ok((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
      }
      if (chunk === "VP8X") return ok(1 + (b[24] | (b[25] << 8) | (b[26] << 16)), 1 + (b[27] | (b[28] << 8) | (b[29] << 16)));
      return null;
    }
  } catch {
    return null;
  }
  return null;
}

const ok = (width: number, height: number): ImageSize | null =>
  width > 0 && height > 0 && width <= 20000 && height <= 20000 ? { width, height } : null;
