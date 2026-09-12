import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Suicide, Self-Harm & Crisis Escalation",
};

export default function Page() {
  return <PolicyPage slug="crisis" />;
}
