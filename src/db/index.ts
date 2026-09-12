import "server-only";

/**
 * Application-facing database entry point.
 *
 * The `server-only` import makes it a build error to reach the database from a
 * Client Component, so connection credentials can never be pulled into a
 * browser bundle. Scripts that run outside the Next bundler import
 * `./client` directly instead.
 */
export { getDb, schema } from "./client";
