"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Icon } from "./icons";

/**
 * Public-site nav control: "My account" when signed in, "Book a Consultation"
 * otherwise.
 *
 * Resolved client-side with `useAuth` rather than server-side with `auth()`,
 * deliberately. Reading auth on the server would make every public page
 * dynamic, and the marketing site and all thirteen policy pages are better off
 * statically generated. `<SignedIn>` is not available in Clerk Core 3, so the
 * hook is the supported route.
 *
 * Until Clerk has loaded, the signed-out CTA is shown — that is the right
 * default for the overwhelming majority of visitors to a public site.
 */
export function AccountNavLink({ className }: { className?: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const signedIn = isLoaded && isSignedIn;

  return (
    <Link
      href={signedIn ? "/portal" : "/book"}
      className={`pill ${signedIn ? "pill-teal" : "pill-gold"} ${className ?? ""}`}
      style={{ padding: "9px 18px", fontSize: 13 }}
    >
      {signedIn ? "My account" : "Book a Consultation"}
      <Icon name="arrow" size={16} />
    </Link>
  );
}
