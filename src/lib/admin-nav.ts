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
export type NavGroup = "today" | "care" | "content" | "business" | "team";

/** The menu's sections, in the order they are shown. */
export const NAV_GROUPS: { key: NavGroup; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "care", label: "Client care" },
  { key: "content", label: "Content" },
  { key: "business", label: "Business" },
  { key: "team", label: "Team" },
];

export type NavIconName =
  | "dashboard" | "calendar" | "clock" | "inbox" | "users" | "shield" | "clipboard" | "book"
  | "pen" | "megaphone" | "tag" | "percent" | "trend" | "receipt" | "chart" | "team" | "briefcase" | "pulse";

export type NavItem = {
  label: string;
  href: string;
  /** The capability the destination page requires. */
  capability: Capability;
  /** The menu section it sits in. Running the organisation is kept apart from delivering the service. */
  group: NavGroup;
  icon: NavIconName;
};

/** In the order shown: grouped, and within a group by how often it is used. */
export const ADMIN_NAV: NavItem[] = [
  // The day's work.
  { label: "Dashboard", href: "/admin", capability: "client:read:any", group: "today", icon: "dashboard" },
  { label: "Appointments", href: "/admin/appointments", capability: "appointment:manage:any", group: "today", icon: "calendar" },
  { label: "Availability", href: "/admin/availability", capability: "availability:manage", group: "today", icon: "clock" },
  // Website enquiries and callback requests (IT handover §16.4, §19).
  { label: "Enquiries", href: "/admin/enquiries", capability: "enquiry:manage", group: "today", icon: "inbox" },

  // Delivering the service.
  { label: "Clients", href: "/admin/clients", capability: "client:read:any", group: "care", icon: "users" },
  { label: "Safeguarding", href: "/admin/safeguarding", capability: "safeguarding:read", group: "care", icon: "shield" },
  // Supervision sheets, preparation tasks and the worksheet library.
  { label: "Resources", href: "/admin/resources", capability: "worksheet:manage", group: "care", icon: "clipboard" },
  // Practitioner guides, teaching slides and client materials for every session.
  { label: "Library", href: "/admin/library", capability: "library:read", group: "care", icon: "book" },

  // Writing, reviewing and publishing blog posts.
  { label: "Blog", href: "/admin/blog", capability: "blog:write", group: "content", icon: "pen" },
  // Brand kit, photos and graphics, social posts, newsletter (the marketing hub).
  { label: "Marketing", href: "/admin/marketing", capability: "marketing:write", group: "content", icon: "megaphone" },

  // Running the organisation.
  { label: "Services & prices", href: "/admin/catalogue", capability: "catalogue:manage", group: "business", icon: "tag" },
  // Concessions, discount codes and free sessions.
  { label: "Discounts", href: "/admin/discounts", capability: "discount:manage", group: "business", icon: "percent" },
  { label: "Revenue", href: "/admin/revenue", capability: "revenue:read", group: "business", icon: "trend" },
  { label: "Accounting", href: "/admin/accounting", capability: "accounting:read", group: "business", icon: "receipt" },
  { label: "Reports", href: "/admin/reports", capability: "report:read", group: "business", icon: "chart" },

  { label: "Staff", href: "/admin/staff", capability: "staff:read", group: "team", icon: "team" },
  { label: "HR", href: "/admin/hr", capability: "hr:read", group: "team", icon: "briefcase" },
  { label: "Activity", href: "/admin/activity", capability: "audit:read", group: "team", icon: "pulse" },
];

/** The items this actor may actually reach. */
export function navFor(actor: Actor | null): NavItem[] {
  if (!actor) return [];
  return ADMIN_NAV.filter((item) => can(actor, item.capability));
}

/** The actor's menu as sections, leaving out any section they have nothing in. */
export function navGroupsFor(actor: Actor | null): { key: NavGroup; label: string; items: NavItem[] }[] {
  const items = navFor(actor);
  return NAV_GROUPS.map((g) => ({ ...g, items: items.filter((i) => i.group === g.key) })).filter((g) => g.items.length > 0);
}

/**
 * The menu entry a path belongs to: the longest href it sits under, so
 * /admin/clients/123 lights up Clients. The dashboard matches only itself.
 */
export function activeNavHref(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    const hit = href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
    if (hit && (!best || href.length > best.length)) best = href;
  }
  return best;
}
