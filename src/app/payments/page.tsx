import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Cancellation and Refund Policy",
};

export default function Page() {
  return <PolicyPage slug="payments" />;
}
