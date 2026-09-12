import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <AuthShell
      title="Sign in to ThrivSphere"
      intro="Your sessions, appointments and messages live here. Nothing personal is ever sent by ordinary email."
    >
      <SignIn />
    </AuthShell>
  );
}
