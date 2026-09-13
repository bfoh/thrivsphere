"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Icon } from "./icons";

/**
 * Public-site account control.
 *
 * Signed in: a single "My account" button.
 * Signed out: a quiet "Sign in" link *beside* the booking CTA — not instead of
 * it. Until now the public site offered no way back in at all: the only
 * auth-adjacent link was "Book a Consultation", which goes to the enquiry form.
 * A client who had already registered had no route to their own portal.
 *
 * The two are weighted deliberately. Booking is what a new visitor needs and
 * keeps the gold CTA; signing in is what a returning client needs and only has
 * to be findable, not loud.
 *
 * Resolved client-side with `useAuth` rather than server-side with `auth()`:
 * reading auth on the server would make every public page dynamic, and the
 * marketing site and thirteen policy pages are better statically generated.
 * `<SignedIn>` is not available in Clerk Core 3, so the hook is the route.
 */
export function AccountNavLink({ className }: { className?: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const signedIn = isLoaded && isSignedIn;

  if (signedIn) {
    return (
      <Link
        href="/portal"
        className={`pill pill-teal ${className ?? ""}`}
        style={{ padding: "9px 18px", fontSize: 13 }}
      >
        My account
        <Icon name="arrow" size={16} />
      </Link>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 16 }}>
      <Link
        href="/sign-in"
        className={className}
        style={{
          fontSize: 14.5,
          fontWeight: 700,
          color: "var(--navy)",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Sign in
      </Link>
      <Link
        href="/book"
        className={`pill pill-gold ${className ?? ""}`}
        style={{ padding: "9px 18px", fontSize: 13 }}
      >
        Book a Consultation
        <Icon name="arrow" size={16} />
      </Link>
    </span>
  );
}
