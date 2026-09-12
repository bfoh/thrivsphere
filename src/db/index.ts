import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Provision the Neon integration and run `vercel env pull .env.local`."
    );
  }
  return drizzle(neon(url), { schema });
}

let cached: ReturnType<typeof createDb> | null = null;

/**
 * Database handle.
 *
 * Lazily created rather than built at module scope: `neon()` throws when
 * DATABASE_URL is missing, and Next evaluates top-level module code during
 * `next build`, which would break any build run before the database is
 * provisioned.
 *
 * Deliberately a plain function and not a `Proxy` wrapper — a Proxy intercepts
 * the property checks that auth and migration libraries perform on the client
 * object, which fails in confusing, silent ways.
 */
export function getDb() {
  if (!cached) cached = createDb();
  return cached;
}

export { schema };
