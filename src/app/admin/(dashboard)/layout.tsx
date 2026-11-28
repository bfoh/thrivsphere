import * as React from "react";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getCurrentActor } from "@/lib/session";
import { can, isStaff } from "@/lib/authz";
import { navGroupsFor } from "@/lib/admin-nav";
import { roleLabel } from "@/lib/staff-rules";
import { navCounts } from "@/lib/queries/nav-counts";
import { AdminShell, type ShellGroup } from "@/components/admin/AdminShell";
import "./admin.css";

/**
 * Admin chrome: a sidebar of sections and a slim top bar.
 *
 * No crisis bar: this is the staff side, and the bar is aimed at people seeking
 * support. The confidentiality reminder is aimed at staff instead.
 *
 * The menu is built from the signed-in person's capabilities rather than a
 * fixed list, so a practitioner is never shown a page they cannot open. That is
 * a courtesy, not a control — every page still guards itself.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getCurrentActor();

  // A client who reaches the back office belongs in their portal, not at a
  // sign-in wall or an error page.
  if (!actor) redirect("/admin/login");
  if (!isStaff(actor)) redirect("/portal");

  const [[me], counts] = await Promise.all([
    getDb().select({ displayName: users.displayName, email: users.email }).from(users).where(eq(users.id, actor.userId)).limit(1),
    navCounts(actor),
  ]);

  const groups: ShellGroup[] = navGroupsFor(actor).map((g) => ({
    key: g.key,
    label: g.label,
    items: g.items.map((i) => ({
      label: i.label,
      href: i.href,
      icon: i.icon,
      count: counts[i.href]?.count || undefined,
      tone: counts[i.href]?.tone,
    })),
  }));

  return (
    <AdminShell
      groups={groups}
      userName={me?.displayName?.trim() || me?.email || "Signed in"}
      roleLabel={roleLabel(actor.role)}
      canSearchClients={can(actor, "client:read:any")}
      userMenu={<UserButton />}
    >
      {children}
    </AdminShell>
  );
}
