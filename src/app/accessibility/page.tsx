import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";
import { policyMetadata } from "@/lib/seo";

export const metadata: Metadata = policyMetadata("accessibility");

export default function Page() {
  return <PolicyPage slug="accessibility" />;
}
