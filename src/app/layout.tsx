import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { CookieBanner } from "@/components/CookieBanner";
import { Analytics } from "@/components/Analytics";
import { CursorFX } from "@/components/CursorFX";

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
  "ThrivSphere Wellbeing CIC is a UK Community Interest Company providing accessible, confidential online wellbeing support, education, coaching, mindfulness and signposting to adults aged 18+ — women and men. A non-clinical service helping you heal, grow and thrive.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      "ThrivSphere Wellbeing CIC — Empowering Wellbeing. Building Resilience. Inspiring Hope.",
    template: "%s — ThrivSphere Wellbeing CIC",
  },
  description,
  applicationName: "ThrivSphere Wellbeing CIC",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "ThrivSphere Wellbeing CIC",
    locale: "en_GB",
    url: SITE_URL,
    title: "ThrivSphere Wellbeing CIC — Empowering Wellbeing. Building Resilience. Inspiring Hope.",
    description,
  },
  twitter: { card: "summary_large_image", title: "ThrivSphere Wellbeing CIC", description },
  robots: { index: true, follow: true },
  // favicon/apple-icon auto-detected from app/icon.png, app/apple-icon.png, app/favicon.ico (the ThrivSphere logo)
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
          appearance={{ variables: { colorPrimary: "#3d8a8a", borderRadius: "0.625rem" } }}
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
