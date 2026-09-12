import "server-only";

/**
 * Server-side encryption helpers.
 *
 * The `server-only` guard makes it a build error to reach these from a Client
 * Component, so the key can never be pulled into a browser bundle. The
 * implementation lives in `./crypto-core` so tests can import it directly —
 * `server-only` is a bundler construct and throws under plain Node.
 */
export { encryptSecret, decryptSecret } from "./crypto-core";
