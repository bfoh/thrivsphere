"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeTab, type MarketingTab } from "@/lib/marketing-tabs";

export function MarketingTabs({ tabs }: { tabs: MarketingTab[] }) {
  const current = activeTab(usePathname() ?? "");
  return (
    <nav aria-label="Marketing" className="adm-subnav">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={current === t.href ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
