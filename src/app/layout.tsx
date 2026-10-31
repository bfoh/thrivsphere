import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { CookieBanner } from "@/components/CookieBanner";
import { Analytics } from "@/components/Analytics";
import { CursorFX } from "@/components/CursorFX";
import { brand } from "@/data/site";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-montserrat",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thrivsphere.org";

/**
 * Clerk copy overrides.
 *
 * Clerk's components interpolate the application name from its dashboard, which
 * defaults to an auto-generated slug ("clerk-indigo-grass"). Setting the titles
 * here keeps the wording correct and in version control rather than depending
 * on a dashboard field. Note this does not affect Clerk's own emails — those
 * follow the application name set in the Clerk dashboard.
 */
const clerkLocalization = {
  signIn: {
    start: {
      title: "Sign in",
      subtitle: "Welcome back. Sign in to reach your sessions and messages.",
    },
  },
  signUp: {
    start: {
      title: "Create your account",
      subtitle: "A few details to get started.",
    },
  },
};

const description =
  "ThriveSphere Wellbeing provides professional, compassionate and personalised online wellbeing support for adults aged 18 and above — helping individuals understand their emotional wellbeing, develop practical coping strategies and strengthen resilience. A non-clinical service; not an emergency mental health service.";

const fullTitle = `${brand.name} — ${brand.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: fullTitle,
    template: `%s — ${brand.name}`,
  },
  description,
  applicationName: brand.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: brand.name,
    locale: "en_GB",
    url: SITE_URL,
    title: fullTitle,
    description,
  },
  twitter: { card: "summary_large_image", title: brand.name, description },
  robots: { index: true, follow: true },
  // favicon/apple-icon auto-detected from app/icon.png, app/apple-icon.png, app/favicon.ico (the ThriveSphere logo)
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className={montserrat.variable}>
        {/* Inside <body> rather than wrapping <html>, which is what Next 16
            cache components require.

            Telemetry is off: this application handles health-adjacent personal
            data, and there is no reason for usage events to leave it for a
            third-party analytics endpoint. */}
        <ClerkProvider
          telemetry={false}
          localization={clerkLocalization}
          appearance={{
            variables: { colorPrimary: "#3d8a8a", borderRadius: "0.625rem" },
            /*
             * Social sign-in is hidden until it is actually configured.
             *
             * The production instance was cloned from development, which had
             * Google enabled on Clerk's shared credentials. Those do not work
             * in production: clicking the button sends the person to a Google
             * error page reading "Missing required parameter: client_id",
             * with no way back. A broken button on a sign-in page is worse
             * than no button.
             *
             * This hides it in our own UI regardless of the dashboard, so the
             * two cannot drift. Set NEXT_PUBLIC_ENABLE_SOCIAL_SIGNIN=true once
             * real Google credentials are in place.
             */
            elements:
              process.env.NEXT_PUBLIC_ENABLE_SOCIAL_SIGNIN === "true"
                ? undefined
                : { socialButtons: { display: "none" }, dividerRow: { display: "none" } },
          }}
        >
          {children}
          <CursorFX />
          <CookieBanner />
          <Analytics />
        </ClerkProvider>
      </body>
    </html>
  );
}
