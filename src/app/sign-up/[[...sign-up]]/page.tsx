import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = {
  title: "Create your account",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <AuthShell
      title="Create your ThrivSphere account"
      intro="You'll confirm you're 18 or over and read our consent and confidentiality policies before your first session."
    >
      {/* Straight into registration — the 18+ gate and consent come
          before anything else, and /portal routes them there. */}
      <SignUp forceRedirectUrl="/portal" signInUrl="/sign-in" />
    </AuthShell>
  );
}
