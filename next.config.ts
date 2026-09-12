import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * The Clerk instance this build talks to.
 *
 * Derived from the publishable key rather than hardcoded, so the same config
 * works for the development instance (*.clerk.accounts.dev) and a production
 * one on a custom domain without anyone remembering to edit the CSP.
 */
function clerkHost(): string | null {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return null;
  try {
    const encoded = key.replace(/^pk_(test|live)_/, "");
    const host = Buffer.from(encoded, "base64").toString("utf8").replace(/\$$/, "");
    return /^[a-z0-9.-]+$/i.test(host) ? host : null;
  } catch {
    return null;
  }
}

const clerk = clerkHost();
const clerkOrigins = [
  clerk ? `https://${clerk}` : null,
  // The development instance serves clerk-js from a subdomain of accounts.dev.
  "https://*.clerk.accounts.dev",
]
  .filter(Boolean)
  .join(" ");

/**
 * Content Security Policy.
 *
 * Pragmatic for launch: the site styles almost entirely through inline `style`
 * attributes, and Next injects its own inline bootstrap scripts, so both need
 * 'unsafe-inline' until a nonce is introduced in `proxy.ts`. Everything else
 * is limited to same-origin plus the few hosts that must be reachable.
 *
 * Clerk is listed explicitly because authentication loads its script and calls
 * its API from its own origin; without these the sign-in form silently renders
 * as an empty space, which is exactly how this was first found.
 *
 * `frame-ancestors 'none'` prevents the site — and the client portal — being
 * framed by anyone.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${clerkOrigins} https://challenges.cloudflare.com https://www.googletagmanager.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://img.clerk.com ${clerkOrigins} https://www.googletagmanager.com`,
  "font-src 'self' data:",
  `connect-src 'self' ${clerkOrigins} https://www.google-analytics.com`,
  // Clerk runs part of its client in a blob-backed worker.
  "worker-src 'self' blob:",
  // Clerk's bot protection renders a Cloudflare Turnstile frame.
  `frame-src 'self' ${clerkOrigins} https://challenges.cloudflare.com`,
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // HSTS is only meaningful over HTTPS; Vercel terminates TLS for us.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // `payment` stays closed because checkout is hosted off-site; camera and
  // microphone are closed until sessions are delivered in-app rather than via
  // an external meeting link.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
