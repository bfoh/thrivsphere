import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Scope of Practice",
};

export default function Page() {
  return <PolicyPage slug="scope-of-practice" />;
}
