/**
 * Publishes a library build: uploads its files to private Blob storage and
 * points the app at the new manifest.
 *
 *   npm run library:upload
 *
 * Run after `npm run library:build`. Uses BLOB_READ_WRITE_TOKEN from
 * .env.local, so it writes to whichever store that token belongs to; check
 * it is the production store before publishing.
 *
 * Every file is named after its own content, so uploading is additive and
 * safe to repeat: a file already in storage is skipped, and nothing is ever
 * overwritten or deleted. The manifest goes last, so it is only uploaded
 * once everything it refers to is in place. The script then writes the
 * manifest's name into src/lib/library/version.ts; commit that file and
 * deploy to publish. Until then the site keeps showing the previous build.
 */
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BlobNotFoundError, head, put } from "@vercel/blob";
import { blobPathFor, CONTENT_TYPES, parseAssetName } from "../../src/lib/library/assets";

const ROOT = join(import.meta.dirname, "..", "..");
const OUT = join(ROOT, "library-build");
const VERSION_FILE = join(ROOT, "src", "lib", "library", "version.ts");
const YEAR = 60 * 60 * 24 * 365;
const PARALLEL = 6;

async function exists(pathname: string): Promise<boolean> {
  try {
    await head(pathname);
    return true;
  } catch (err) {
    if (err instanceof BlobNotFoundError) return false;
    throw err;
  }
}

async function upload(name: string): Promise<"uploaded" | "skipped"> {
  const parsed = parseAssetName(name);
  if (!parsed) throw new Error(`Not a library asset name: ${name}`);
  const pathname = blobPathFor(name);
  if (await exists(pathname)) return "skipped";
  const file = join(OUT, "assets", name);
  const big = statSync(file).size > 20 * 1024 * 1024;
  await put(pathname, readFileSync(file), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: CONTENT_TYPES[parsed.ext],
    cacheControlMaxAge: YEAR,
    multipart: big,
  });
  return "uploaded";
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is not set (run through npm run library:upload)");
  const manifest = readFileSync(join(OUT, "manifest.txt"), "utf8").trim();
  if (!parseAssetName(manifest)) throw new Error(`manifest.txt does not name a manifest: ${manifest}`);
  const names: string[] = JSON.parse(readFileSync(join(OUT, "upload.json"), "utf8"));
  const files = names.filter((n) => n !== manifest);

  let uploaded = 0;
  let skipped = 0;
  let next = 0;
  const worker = async () => {
    while (next < files.length) {
      const name = files[next++];
      for (let attempt = 1; ; attempt++) {
        try {
          if ((await upload(name)) === "uploaded") uploaded++;
          else skipped++;
          break;
        } catch (err) {
          if (attempt >= 3) throw err;
          await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
      }
      const done = uploaded + skipped;
      if (done % 50 === 0 || done === files.length) console.log(`  ${done}/${files.length} (${uploaded} uploaded, ${skipped} already there)`);
    }
  };
  console.log(`Uploading ${files.length} library files…`);
  await Promise.all(Array.from({ length: PARALLEL }, worker));

  if ((await upload(manifest)) === "uploaded") uploaded++;
  else skipped++;
  console.log(`Manifest ${manifest} in place.`);

  writeFileSync(
    VERSION_FILE,
    readFileSync(VERSION_FILE, "utf8").replace(
      /export const LIBRARY_MANIFEST: string \| null = .*;/,
      `export const LIBRARY_MANIFEST: string | null = ${JSON.stringify(manifest)};`,
    ),
  );
  console.log(`\nDone: ${uploaded} uploaded, ${skipped} already there.\nsrc/lib/library/version.ts now points at this build. Commit it and deploy to publish.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
