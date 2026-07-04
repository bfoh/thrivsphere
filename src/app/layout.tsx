import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { CookieBanner } from "@/components/CookieBanner";
import { CursorFX } from "@/components/CursorFX";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ThrivSphere Wellbeing CIC — Empowering Wellbeing. Building Resilience. Inspiring Hope.",
  description:
    "ThrivSphere Wellbeing CIC is a UK Community Interest Company providing accessible, confidential online wellbeing support, coaching, mindfulness and community for women — helping you heal, grow and thrive.",
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
      </body>
    </html>
  );
}
