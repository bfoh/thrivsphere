import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function Page() {
  return <PolicyPage slug="privacy" />;
}
