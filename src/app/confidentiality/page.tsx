import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Confidentiality Statement",
};

export default function Page() {
  return <PolicyPage slug="confidentiality" />;
}
