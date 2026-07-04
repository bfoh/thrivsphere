import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Terms & Conditions — ThrivSphere Wellbeing CIC",
};

export default function Page() {
  return <PolicyPage slug="terms" />;
}
