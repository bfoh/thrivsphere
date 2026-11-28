import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";
import { policyMetadata } from "@/lib/seo";

export const metadata: Metadata = policyMetadata("edi");

export default function Page() {
  return <PolicyPage slug="edi" />;
}
