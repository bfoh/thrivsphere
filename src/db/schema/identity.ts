import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";

/**
 * Access levels.
 *
 * `founder` owns the service. Only a founder manages admins, and the last
 * founder cannot be demoted or blocked — without that, any admin could lock
 * the organisation out of its own system.
 */
export const userRole = pgEnum("user_role", [
  "client",
  "practitioner",
  "supervisor",
  "admin",
  "founder",
]);

export const userStatus = pgEnum("user_status", ["active", "suspended", "deleted"]);

/**
 * Mirror of the identity provider's user record.
 *
 * Authentication lives with the provider (Clerk); this table holds only what
 * ThrivSphere needs to make authorisation decisions and to own its own foreign
 * keys. Passwords and MFA secrets are never stored here.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Provider subject id, e.g. Clerk's `user_...`. */
    authId: text("auth_id").notNull().unique(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    role: userRole("role").notNull().default("client"),
    status: userStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (t) => [index("users_role_idx").on(t.role)]
);

export const auditAction = pgEnum("audit_action", [
  "view",
  "logout",
  "create",
  "update",
  "delete",
  "export",
  "login",
  "permission_denied",
]);

/**
 * Append-only access log.
 *
 * The brief requires that client records are "only accessible to authorised
 * people". Restricting access is half of that; being able to show afterwards
 * who looked at what is the other half, and it is what an ICO enquiry or a
 * safeguarding review will actually ask for. Every read and write of a client
 * record writes a row here, including denied attempts.
 *
 * Nothing in the application deletes from this table.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Null only for unauthenticated attempts, which are still worth recording. */
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: auditAction("action").notNull(),
    /** Table name of the record touched, e.g. "session_notes". */
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    /** The client whose confidential data was involved, where applicable. */
    subjectClientId: uuid("subject_client_id"),
    /** Short human-readable note, e.g. "viewed safeguarding concern". */
    detail: text("detail"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_actor_idx").on(t.actorId),
    index("audit_subject_idx").on(t.subjectClientId),
    index("audit_created_idx").on(t.createdAt),
  ]
);
