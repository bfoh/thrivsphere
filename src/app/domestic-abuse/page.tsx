import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";
import { policyMetadata } from "@/lib/seo";

export const metadata: Metadata = policyMetadata("domestic-abuse");

export default function Page() {
  return <PolicyPage slug="domestic-abuse" />;
}
