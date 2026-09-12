import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Domestic Abuse & Safe Disclosure",
};

export default function Page() {
  return <PolicyPage slug="domestic-abuse" />;
}
