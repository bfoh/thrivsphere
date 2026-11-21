import { can, type Actor, type Capability } from "./authz";

/**
 * The marketing hub's tabs, each with the capability its page requires.
 * Like the admin menu, this is navigation, not access control: every page
 * guards itself, and marketing-tabs.test.ts checks each tab has a page.
 */
export type MarketingTab = { label: string; href: string; capability: Capability };

export const MARKETING_TABS: MarketingTab[] = [
  { label: "Overview", href: "/admin/marketing", capability: "marketing:write" },
  { label: "Brand kit", href: "/admin/marketing/brand", capability: "marketing:write" },
  { label: "Photos & graphics", href: "/admin/marketing/library", capability: "marketing:write" },
  { label: "Make a graphic", href: "/admin/marketing/graphics", capability: "marketing:write" },
  { label: "AI usage", href: "/admin/marketing/ai-usage", capability: "analytics:read" },
];

export function tabsFor(actor: Actor | null): MarketingTab[] {
  if (!actor) return [];
  return MARKETING_TABS.filter((t) => can(actor, t.capability));
}

/** The tab a path belongs to: the longest matching prefix. */
export function activeTab(pathname: string): string | null {
  const match = MARKETING_TABS.filter((t) => pathname === t.href || pathname.startsWith(`${t.href}/`)).sort((a, b) => b.href.length - a.href.length)[0];
  return match?.href ?? null;
}
