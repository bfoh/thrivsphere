import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Equality, Diversity & Inclusion",
};

export default function Page() {
  return <PolicyPage slug="edi" />;
}
