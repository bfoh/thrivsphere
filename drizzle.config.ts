import type { Config } from "drizzle-kit";

/**
 * drizzle-kit does not load .env.local the way Next does, so run migration
 * commands through dotenv-cli:
 *   npx dotenv -e .env.local -- npx drizzle-kit generate
 *   npx dotenv -e .env.local -- npx drizzle-kit migrate
 */
export default {
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  // Keep generated SQL reviewable — these migrations touch confidential records.
  verbose: true,
  strict: true,
} satisfies Config;
