/**
 * Promote a user to a staff role.
 *
 * Staff access is never granted by signing up — new accounts are always
 * `client`. Promotion is a deliberate act performed by someone with database
 * access, which keeps the path to a client record narrow and traceable.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/grant-role.ts <email> <role>
 *
 * Roles: client | practitioner | supervisor | admin
 */
import { eq } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { users } from "../src/db/schema";

const ROLES = ["client", "practitioner", "supervisor", "admin"] as const;
type RoleName = (typeof ROLES)[number];

async function main() {
  const [identifier, role] = process.argv.slice(2);
  // Accept an authId directly, so an ambiguous email can still be resolved.
  const byAuthId = identifier?.startsWith("user_");
  const email = identifier;

  if (!identifier || !role) {
    console.error("Usage: grant-role.ts <email|authId> <role>");
    console.error(`Roles: ${ROLES.join(" | ")}`);
    process.exit(1);
  }
  if (!ROLES.includes(role as RoleName)) {
    console.error(`Unknown role "${role}". Roles: ${ROLES.join(" | ")}`);
    process.exit(1);
  }

  const db = getDb();
  const matches = byAuthId
    ? await db.select().from(users).where(eq(users.authId, identifier))
    : await db.select().from(users).where(eq(users.email, email));

  if (matches.length === 0) {
    console.error(
      `No user with email ${email}. They must sign in once first so the account exists.`
    );
    process.exit(1);
  }

  /*
   * Email is not unique — only authId is. The same person signing up again
   * against a new identity provider instance produces a second row, and
   * picking one arbitrarily could grant staff access to a dead account while
   * leaving the live one as a client. Refuse and make the choice explicit.
   */
  if (matches.length > 1) {
    console.error(`${matches.length} accounts share the email ${email}:\n`);
    for (const m of matches) {
      console.error(`  authId: ${m.authId}`);
      console.error(`    role: ${m.role}  created: ${m.createdAt.toISOString()}\n`);
    }
    console.error("Re-run with the authId instead of the email:");
    console.error(`  grant-role.ts <authId> ${role}`);
    process.exit(1);
  }

  const existing = matches[0];

  const [updated] = await db
    .update(users)
    .set({ role: role as RoleName, updatedAt: new Date() })
    .where(eq(users.id, existing.id))
    .returning();

  console.log(`${updated.email}: ${existing.role} -> ${updated.role}`);
  console.log(
    "Note: this change is made outside the application, so it does not appear in audit_log."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
