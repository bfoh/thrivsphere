/**
 * Promote an account to founder.
 *
 * The founder role cannot be granted from inside the application by anyone
 * other than an existing founder, which leaves a chicken-and-egg problem the
 * first time and after any accident that removes the last one. This is the way
 * back in.
 *
 * Deliberately a script rather than a screen: locking an organisation out of
 * its own service is a worse failure than an emergency change made outside the
 * audit trail, and this at least says so out loud.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/promote-founder.ts <email|authId>
 */
import { eq } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { users } from "../src/db/schema";

async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.error("Usage: promote-founder.ts <email|authId>");
    process.exit(1);
  }

  const db = getDb();
  const matches = identifier.startsWith("user_")
    ? await db.select().from(users).where(eq(users.authId, identifier))
    : await db.select().from(users).where(eq(users.email, identifier));

  if (matches.length === 0) {
    console.error(`No account matches ${identifier}.`);
    process.exit(1);
  }
  if (matches.length > 1) {
    console.error(`${matches.length} accounts share that email. Re-run with an authId:\n`);
    for (const m of matches) console.error(`  ${m.authId}  (${m.role})`);
    process.exit(1);
  }

  const [user] = matches;
  const [updated] = await db
    .update(users)
    .set({ role: "founder", updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  console.log(`${updated.email}: ${user.role} -> founder`);
  console.log("Made outside the application, so it does not appear in the activity log.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
