import crypto from "node:crypto";

/**
 * Authenticated encryption for the few fields that must not sit in the
 * database as plain text — currently session joining links.
 *
 * AES-256-GCM, with a random IV per value and the auth tag stored alongside,
 * so a tampered ciphertext fails to decrypt rather than returning something
 * plausible. Format: v1.<iv>.<tag>.<ciphertext>, all base64url.
 *
 * Application code imports `./crypto`, which adds the `server-only` guard;
 * this module exists without it so Node test scripts can exercise the logic.
 *
 * The key comes from APP_ENCRYPTION_KEY (32 bytes, base64 or hex). Losing it
 * makes existing links undecryptable, which is inconvenient but not dangerous:
 * a link can be pasted again. Rotating it therefore does not need a migration.
 */
const VERSION = "v1";

function getKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "APP_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32"
    );
  }
  const key = raw.length === 64 ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, b64(iv), b64(tag), b64(enc)].join(".");
}

/**
 * Decrypt a stored value.
 *
 * Returns null rather than throwing when a value is missing, malformed or
 * fails its authentication tag — a broken joining link should show the
 * practitioner an empty field to re-paste, not take down the appointment page.
 */
export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const [version, iv, tag, data] = value.split(".");
    if (version !== VERSION || !iv || !tag || !data) return null;

    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), ub64(iv));
    decipher.setAuthTag(ub64(tag));
    return Buffer.concat([decipher.update(ub64(data)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

const b64 = (b: Buffer) => b.toString("base64url");
const ub64 = (s: string) => Buffer.from(s, "base64url");
