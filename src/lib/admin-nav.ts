import { can, type Actor, type Capability } from "./authz";

/**
 * The admin navigation, derived from capabilities.
 *
 * Previously a hardcoded list, which meant the menu and the access rules were
 * two independent things that could disagree. A link to a page the guard would
 * refuse is a confusing dead end; a page reachable but unlinked is worse,
 * because nobody notices it is exposed.
 *
 * Each entry names the capability its page already requires, so the two cannot
 * drift: if a page's guard changes, this must change with it or the test in
 * admin-nav.test.ts fails.
 *
 * This is navigation, not access control. Every page keeps its own
 * `requireCapability()` call — hiding a link protects nothing.
 */
export type NavItem = {
  label: string;
  href: string;
  /** The capability the destination page requires. */
  capability: Capability;
  /** Grouped in the menu; administration is visually separated from delivery. */
  group: "service" | "organisation";
};

export const ADMIN_NAV: NavItem[] = [
  // Delivering the service.
  { label: "Dashboard", href: "/admin", capability: "client:read:any", group: "service" },
  { label: "Clients", href: "/admin/clients", capability: "client:read:any", group: "service" },
  { label: "Appointments", href: "/admin/appointments", capability: "appointment:manage:any", group: "service" },
  { label: "Availability", href: "/admin/availability", capability: "availability:manage", group: "service" },
  { label: "Safeguarding", href: "/admin/safeguarding", capability: "safeguarding:read", group: "service" },
  { label: "Reports", href: "/admin/reports", capability: "report:read", group: "service" },

  // Running the organisation.
  { label: "Staff", href: "/admin/staff", capability: "staff:read", group: "organisation" },
  { label: "Activity", href: "/admin/activity", capability: "audit:read", group: "organisation" },
  { label: "Revenue", href: "/admin/revenue", capability: "revenue:read", group: "organisation" },
  { label: "HR", href: "/admin/hr", capability: "hr:read", group: "organisation" },
  { label: "Accounting", href: "/admin/accounting", capability: "accounting:read", group: "organisation" },
];

/** The items this actor may actually reach. */
export function navFor(actor: Actor | null): NavItem[] {
  if (!actor) return [];
  return ADMIN_NAV.filter((item) => can(actor, item.capability));
}
