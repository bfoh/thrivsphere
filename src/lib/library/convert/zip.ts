import { inflateRawSync } from "node:zlib";

/**
 * Reads the entries of a zip file (.docx and .pptx are zips).
 *
 * Only what Office writes is supported: stored or deflated entries, found
 * through the central directory. Entry names are taken as given and only
 * ever used as map keys, never as paths on disk.
 */
export type ZipEntries = Map<string, Buffer>;

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

export function readZip(buf: Buffer): ZipEntries {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error("Not a zip file");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);

  const out: ZipEntries = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== CENTRAL) throw new Error("Bad zip central directory");
    const method = buf.readUInt16LE(p + 10);
    const compressed = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;

    if (name.endsWith("/")) continue;
    if (buf.readUInt32LE(local) !== LOCAL) throw new Error(`Bad zip entry ${name}`);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + compressed);
    const data = method === 0 ? Buffer.from(raw) : method === 8 ? inflateRawSync(raw) : null;
    if (!data) throw new Error(`Unsupported zip compression ${method} in ${name}`);
    if (data.length !== size) throw new Error(`Zip entry ${name} is damaged`);
    out.set(name, data);
  }
  return out;
}

export const zipText = (z: ZipEntries, name: string): string | null => z.get(name)?.toString("utf8") ?? null;
