/**
 * Library files in Blob storage.
 *
 * Everything the build produces is stored under one folder with a name made
 * from its own SHA-256, so the asset route can accept a name from the URL
 * and still only ever reach library files: anything that is not exactly
 * `<hex>.<known extension>` is refused before storage is touched. Client
 * documents live in the same store under other paths and must stay out of
 * reach of this route.
 */

export const LIBRARY_PREFIX = "library/assets/";

export const CONTENT_TYPES = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  pdf: "application/pdf",
  html: "text/html; charset=utf-8",
  json: "application/json",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
} as const;

export type AssetExtension = keyof typeof CONTENT_TYPES;

const NAME = /^([a-f0-9]{32,64})\.([a-z]{3,4})$/;

export function parseAssetName(name: string): { name: string; ext: AssetExtension } | null {
  const m = NAME.exec(name);
  if (!m || !(m[2] in CONTENT_TYPES)) return null;
  return { name, ext: m[2] as AssetExtension };
}

export function blobPathFor(name: string): string {
  const parsed = parseAssetName(name);
  if (!parsed) throw new Error(`Not a library asset name: ${name}`);
  return `${LIBRARY_PREFIX}${parsed.name}`;
}

/** Images and PDFs may open in the browser; everything else downloads. */
export function servedInline(ext: AssetExtension): boolean {
  return ext === "webp" || ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "gif" || ext === "pdf";
}

/**
 * Whether the asset route hands this kind of file to a browser at all.
 * Document HTML and the JSON files are read by the server and rendered
 * inside the app; serving them directly would put a page of the owner's
 * markup at an address of its own.
 */
export function servedByRoute(ext: AssetExtension): boolean {
  return ext !== "html" && ext !== "json";
}

/** The URL staff load an asset from. `download` names the saved file. */
export function assetUrl(name: string, download?: string): string {
  const base = `/api/admin/library/assets/${name}`;
  return download ? `${base}?download=${encodeURIComponent(download)}` : base;
}

/**
 * A download file name that is safe in a Content-Disposition header: no
 * quotes, slashes or control characters, and an extension we chose.
 */
export function safeDownloadName(requested: string | null, ext: AssetExtension): string {
  const base = (requested ?? "")
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[^\p{L}\p{N} ()&,_.–—-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return `${base || "ThriveSphere resource"}.${ext}`;
}

/**
 * The Content-Disposition header: a download under the requested name, or
 * inline for a picture or PDF opened in the browser. The name is sent twice,
 * as plain ASCII for old clients and in full as RFC 5987 UTF-8.
 */
export function contentDisposition(ext: AssetExtension, download: string | null): string {
  if (download === null && servedInline(ext)) return "inline";
  const name = safeDownloadName(download, ext);
  const ascii = name.normalize("NFKD").replace(/[–—]/g, "-").replace(/[^\x20-\x7e]/g, "").replace(/\s+/g, " ").trim() || `resource.${ext}`;
  const utf8 = encodeURIComponent(name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}
