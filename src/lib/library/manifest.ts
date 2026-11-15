import "server-only";
import { get } from "@vercel/blob";
import { blobPathFor } from "./assets";
import { LIBRARY_MANIFEST } from "./version";
import type { LibraryCollection, LibraryManifest, LibraryMaterial, SearchIndex } from "./types";

/**
 * Reads the published library from private Blob storage.
 *
 * Every library file is named after its own content, so a file read once
 * never changes: each is kept in memory for the life of the server instance
 * after the first read. A failed read is not kept, so the next request tries
 * again.
 */

const cache = new Map<string, Promise<string>>();

function readText(name: string): Promise<string> {
  let p = cache.get(name);
  if (!p) {
    p = (async () => {
      const result = await get(blobPathFor(name), { access: "private" });
      if (!result?.stream) throw new Error(`Library file ${name} is missing`);
      return new Response(result.stream).text();
    })();
    p.catch(() => cache.delete(name));
    cache.set(name, p);
  }
  return p;
}

/** The library, or null if none has been published yet or it cannot be read. */
export async function getLibrary(): Promise<LibraryManifest | null> {
  if (!LIBRARY_MANIFEST) return null;
  try {
    return JSON.parse(await readText(LIBRARY_MANIFEST)) as LibraryManifest;
  } catch (err) {
    console.error("[library] manifest read failed", err);
    return null;
  }
}

export async function getSearchIndex(library: LibraryManifest): Promise<SearchIndex> {
  return JSON.parse(await readText(library.search)) as SearchIndex;
}

/** A document's HTML, as the build rendered it. */
export function getDocumentHtml(asset: string): Promise<string> {
  return readText(asset);
}

export function findCollection(library: LibraryManifest, slug: string): LibraryCollection | null {
  return library.collections.find((c) => c.slug === slug) ?? null;
}

export function findMaterial(collection: LibraryCollection, id: string): LibraryMaterial | null {
  return collection.materials.find((m) => m.id === id) ?? null;
}
