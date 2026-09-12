import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thrivsphere.org.uk";

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
        {children}
        <CursorFX />
        <CookieBanner />
        <Analytics />
      </body>
    </html>
  );
}
