import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Complaints & Feedback",
};

export default function Page() {
  return <PolicyPage slug="complaints" />;
}
