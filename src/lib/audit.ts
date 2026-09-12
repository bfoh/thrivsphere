import "server-only";

import { headers } from "next/headers";
import { getDb } from "@/db";
import { auditLog } from "@/db/schema";

export type AuditAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "export"
  | "login"
  | "permission_denied";

export type AuditEntry = {
  actorId: string | null;
  action: AuditAction;
  /** Table name of the record touched, e.g. "session_notes". */
  entity: string;
  entityId?: string | null;
  /** The client whose confidential data was involved, where applicable. */
  subjectClientId?: string | null;
  detail?: string | null;
};

/**
 * Write an access-log row.
 *
 * Deliberately never throws. An audit write failing must not take down the
 * request that triggered it — a practitioner being unable to open a record
 * mid-session because logging had a bad minute is the worse outcome. Failures
 * are logged to the platform logs so they are still visible.
 *
 * This is intentionally fire-and-forget at the call site but awaited here, so
 * the row is written before the response is sent and cannot be lost when the
 * serverless instance is frozen.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = hdrs.get("user-agent") ?? null;

    await getDb().insert(auditLog).values({
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      subjectClientId: entry.subjectClientId ?? null,
      detail: entry.detail ?? null,
      ipAddress: ip,
      userAgent,
    });
  } catch (err) {
    console.error("[audit] failed to write audit row", {
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      err,
    });
  }
}
