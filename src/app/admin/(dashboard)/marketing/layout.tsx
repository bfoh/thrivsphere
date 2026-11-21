import * as React from "react";
import { getCurrentActor } from "@/lib/session";
import { tabsFor } from "@/lib/marketing-tabs";
import { MarketingTabs } from "@/components/admin/marketing/MarketingTabs";

/** The marketing hub's tabs. Each page still checks who may open it. */
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const tabs = tabsFor(await getCurrentActor());
  return (
    <>
      {tabs.length > 0 && <MarketingTabs tabs={tabs} />}
      {children}
    </>
  );
}
