/**
 * What may be uploaded to a client record.
 *
 * An allowlist, not a blocklist. Blocklists for file uploads are a losing game
 * — there is always another extension — so only these types are accepted and
 * everything else is refused.
 *
 * SVG is deliberately absent despite being an image: it can carry script, and
 * would execute in the viewer's browser if ever served inline.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_TYPES: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/heic": ["heic"],
  "text/plain": ["txt"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
};

export const DOCUMENT_CATEGORIES = [
  "intake",
  "consent",
  "correspondence",
  "resource",
  "safeguarding",
  "other",
] as const;

export type UploadCheck = { ok: true } | { ok: false; reason: string };

/**
 * Validate a file before it goes anywhere near storage.
 *
 * Checks the declared type against the allowlist *and* that the extension
 * matches that type, so a renamed executable claiming to be a PDF is refused
 * rather than stored under a misleading name.
 */
export function checkUpload(file: {
  name: string;
  type: string;
  size: number;
}): UploadCheck {
  if (!file.name || file.name.trim() === "") {
    return { ok: false, reason: "That file has no name." };
  }
  if (file.size === 0) {
    return { ok: false, reason: "That file is empty." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      reason: `Files must be under ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`,
    };
  }

  const allowedExtensions = ALLOWED_TYPES[file.type];
  if (!allowedExtensions) {
    return { ok: false, reason: "That file type isn't accepted." };
  }

  const ext = extensionOf(file.name);
  if (!ext || !allowedExtensions.includes(ext)) {
    return { ok: false, reason: "The file's name doesn't match its type." };
  }

  return { ok: true };
}

/**
 * A storage path that cannot escape its client's folder.
 *
 * The original filename is never used as a path segment — it is attacker-
 * controlled and could contain traversal sequences. It is kept in the database
 * for display only; storage uses a generated name.
 */
export function buildBlobPath(clientId: string, filename: string, unique: string): string {
  const ext = extensionOf(filename);
  const safeId = clientId.replace(/[^a-zA-Z0-9-]/g, "");
  const safeUnique = unique.replace(/[^a-zA-Z0-9-]/g, "");
  return `clients/${safeId}/${safeUnique}${ext ? `.${ext}` : ""}`;
}

/** Filename safe to show in a UI or a Content-Disposition header. */
export function sanitiseFilename(filename: string): string {
  return (
    filename
      .replace(/[\r\n"\\]/g, "") // header injection
      .replace(/[/\\]/g, "-") // path separators
      .replace(/\.{2,}/g, ".") // traversal
      .trim()
      .slice(0, 200) || "document"
  );
}

function extensionOf(filename: string): string | null {
  const match = /\.([a-zA-Z0-9]+)$/.exec(filename.trim());
  return match ? match[1].toLowerCase() : null;
}
