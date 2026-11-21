"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeTab, type MarketingTab } from "@/lib/marketing-tabs";

export function MarketingTabs({ tabs }: { tabs: MarketingTab[] }) {
  const current = activeTab(usePathname() ?? "");
  return (
    <nav aria-label="Marketing" style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "14px 24px 0", maxWidth: 1080, margin: "0 auto" }}>
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={current === t.href ? "page" : undefined} className={`pill ${current === t.href ? "pill-teal" : "pill-ghost"}`} style={{ padding: "8px 16px", fontSize: 13 }}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
