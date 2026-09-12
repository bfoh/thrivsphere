import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Consent Policy",
};

export default function Page() {
  return <PolicyPage slug="consent" />;
}
