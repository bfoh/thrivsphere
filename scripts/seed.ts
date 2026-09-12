/**
 * Seeds the reference tables from the static content that shipped in Stage 1.
 *
 * Services, prices and the signposting directory currently live in
 * src/data/site.ts. The brief requires the CIC to edit them without a
 * developer, so they belong in the database — this script is the one-way move.
 * After it runs, src/data/site.ts stays only as the seed source of record.
 *
 * Safe to re-run: every insert is keyed on `slug` and updates rather than
 * duplicating, so it will not clobber prices the client has since edited
 * except for the fields it manages.
 *
 * Run with:
 *   npx dotenv -e .env.local -- npx tsx scripts/seed.ts
 */
import { getDb } from "../src/db/client";
import { pricePlans, services, signpostOrganisations } from "../src/db/schema";
import { plans, services as staticServices, signposts } from "../src/data/site";
import { sql } from "drizzle-orm";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function seedServices() {
  const db = getDb();
  const rows = staticServices.map((s, i) => ({
    slug: slugify(s.title),
    name: s.title,
    description: s.desc,
    // Everything sold at launch is one-to-one. Circles and webinars become
    // `group`/`webinar` when the CIC chooses to switch them on.
    kind: "one_to_one" as const,
    durationMinutes: 50,
    active: true,
    sortOrder: i,
  }));

  await db
    .insert(services)
    .values(rows)
    .onConflictDoUpdate({
      target: services.slug,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        updatedAt: new Date(),
      },
    });
  return rows.length;
}

async function seedPlans() {
  const db = getDb();
  const rows = plans.map((p, i) => ({
    slug: p.slug,
    name: p.name,
    blurb: p.blurb,
    amountPence: p.amountPence,
    currency: "GBP",
    sessions: p.sessions,
    // Packages stay usable for six months; single sessions do not expire.
    validityDays: p.sessions > 1 ? 180 : null,
    featured: p.featured ?? false,
    active: true,
    sortOrder: i,
  }));

  await db
    .insert(pricePlans)
    .values(rows)
    .onConflictDoUpdate({
      target: pricePlans.slug,
      set: {
        name: sql`excluded.name`,
        blurb: sql`excluded.blurb`,
        amountPence: sql`excluded.amount_pence`,
        sessions: sql`excluded.sessions`,
        updatedAt: new Date(),
      },
    });
  return rows.length;
}

async function seedSignposts() {
  const db = getDb();
  const rows = signposts.map((s, i) => ({
    slug: slugify(s.name),
    name: s.name,
    category: s.category,
    phone: s.phone ?? null,
    url: s.url ?? null,
    detail: s.detail,
    urgent: s.urgent ?? false,
    active: true,
    sortOrder: i,
  }));

  await db
    .insert(signpostOrganisations)
    .values(rows)
    .onConflictDoUpdate({
      target: signpostOrganisations.slug,
      set: {
        name: sql`excluded.name`,
        phone: sql`excluded.phone`,
        url: sql`excluded.url`,
        detail: sql`excluded.detail`,
      },
    });
  return rows.length;
}

async function main() {
  const s = await seedServices();
  const p = await seedPlans();
  const o = await seedSignposts();
  console.log(`Seeded ${s} services, ${p} price plans, ${o} signposting organisations.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
