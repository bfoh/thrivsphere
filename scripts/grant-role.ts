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
  const [email, role] = process.argv.slice(2);

  if (!email || !role) {
    console.error("Usage: grant-role.ts <email> <role>");
    console.error(`Roles: ${ROLES.join(" | ")}`);
    process.exit(1);
  }
  if (!ROLES.includes(role as RoleName)) {
    console.error(`Unknown role "${role}". Roles: ${ROLES.join(" | ")}`);
    process.exit(1);
  }

  const db = getDb();
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!existing) {
    console.error(
      `No user with email ${email}. They must sign in once first so the account exists.`
    );
    process.exit(1);
  }

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
