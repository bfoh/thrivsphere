import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";
import { policyMetadata } from "@/lib/seo";

export const metadata: Metadata = policyMetadata("cookies");

export default function Page() {
  return <PolicyPage slug="cookies" />;
}
