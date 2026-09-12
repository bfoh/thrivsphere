import "server-only";

/**
 * Transactional email.
 *
 * The `server-only` guard makes it a build error to send mail from a Client
 * Component, so the API key can never reach a browser bundle. The
 * implementation lives in `./email-core` so tests and scripts can exercise it
 * — `server-only` is a bundler construct and throws under plain Node.
 */
export { sendEmail, type SendResult } from "./email-core";
