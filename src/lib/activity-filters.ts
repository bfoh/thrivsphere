import type { AuditAction } from "./audit";

/**
 * Reading the activity log's filters from the query string.
 *
 * Pure, so the parsing can be tested without a database. Anything unrecognised
 * falls back to the default rather than reaching a query — a filter is a
 * convenience, and an unparseable one should narrow nothing rather than fail
 * the page or, worse, be interpolated somewhere it does not belong.
 */

export const ACTIONS: AuditAction[] = [
  "view",
  "login",
  "logout",
  "create",
  "update",
  "delete",
  "export",
  "permission_denied",
];

export const RANGES = [7, 30, 90, 365] as const;
export type RangeDays = (typeof RANGES)[number];

export const DEFAULT_RANGE: RangeDays = 30;
export const PAGE_SIZE = 100;
export const MAX_PAGE = 50;

export type ActivityFilters = {
  action: AuditAction | null;
  actorId: string | null;
  clientId: string | null;
  days: RangeDays;
  page: number;
  /** Earliest entry to include, derived from `days`. */
  since: Date;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined): string | null => {
  const value = Array.isArray(v) ? v[0] : v;
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

export function parseActivityFilters(params: Params, now = new Date()): ActivityFilters {
  const action = one(params.action);
  const actorId = one(params.actor);
  const clientId = one(params.client);
  const days = Number(one(params.days));
  const page = Number(one(params.page));

  const range: RangeDays = (RANGES as readonly number[]).includes(days)
    ? (days as RangeDays)
    : DEFAULT_RANGE;

  return {
    action: action && (ACTIONS as string[]).includes(action) ? (action as AuditAction) : null,
    actorId: actorId && UUID.test(actorId) ? actorId : null,
    clientId: clientId && UUID.test(clientId) ? clientId : null,
    days: range,
    page: Number.isInteger(page) && page > 1 ? Math.min(page, MAX_PAGE) : 1,
    since: new Date(now.getTime() - range * 24 * 60 * 60 * 1000),
  };
}

/** Rebuild the query string with one filter changed, keeping the rest. */
export function withFilter(
  current: ActivityFilters,
  change: Partial<Record<"action" | "actor" | "client" | "days" | "page", string | null>>
): string {
  const params = new URLSearchParams();
  const merged = {
    action: current.action,
    actor: current.actorId,
    client: current.clientId,
    days: String(current.days),
    page: current.page > 1 ? String(current.page) : null,
    ...change,
  };

  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }

  // Changing a filter should show the first page of the new result, not
  // whatever page number happened to be in the URL.
  if (!("page" in change)) params.delete("page");

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Plain-English label for an action, used in the filter and the table. */
export function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    view: "Viewed",
    login: "Signed in",
    logout: "Signed out",
    create: "Created",
    update: "Changed",
    delete: "Deleted",
    export: "Exported",
    permission_denied: "Refused",
  };
  return labels[action] ?? action;
}
