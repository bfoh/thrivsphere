/**
 * Seeds the reference tables from the static content that shipped in Stage 1.
 *
 * Services, prices and the signposting directory start life in
 * src/data/site.ts. Prices are edited by the owner in the back office
 * (/admin/catalogue), so the database is their record from then on.
 *
 * Insert-only: a row whose `slug` already exists is left exactly as it is, so
 * re-running this can never overwrite a price or wording someone has changed.
 * Changing an existing row is done in the back office or by a migration.
 *
 * Run with:
 *   npx dotenv -e .env.local -- npx tsx scripts/seed.ts
 */
import { getDb } from "../src/db/client";
import { pricePlans, services, signpostOrganisations } from "../src/db/schema";
import { plans, services as staticServices, signposts } from "../src/data/site";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function seedServices() {
  const db = getDb();
  const rows = staticServices.map((s, i) => ({
    slug: s.slug,
    name: s.title,
    description: s.desc,
    // Everything offered at launch is one-to-one.
    kind: "one_to_one" as const,
    durationMinutes: 50,
    active: true,
    sortOrder: i,
  }));

  const added = await db
    .insert(services)
    .values(rows)
    .onConflictDoNothing({ target: services.slug })
    .returning({ id: services.id });
  return added.length;
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

  const added = await db
    .insert(pricePlans)
    .values(rows)
    .onConflictDoNothing({ target: pricePlans.slug })
    .returning({ id: pricePlans.id });
  return added.length;
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

  const added = await db
    .insert(signpostOrganisations)
    .values(rows)
    .onConflictDoNothing({ target: signpostOrganisations.slug })
    .returning({ id: signpostOrganisations.id });
  return added.length;
}

async function main() {
  const s = await seedServices();
  const p = await seedPlans();
  const o = await seedSignposts();
  console.log(`Added ${s} services, ${p} price plans, ${o} signposting organisations (existing rows left unchanged).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
