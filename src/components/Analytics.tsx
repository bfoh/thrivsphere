"use client";

import Script from "next/script";
import { useAnalyticsAllowed } from "@/lib/consent";

/**
 * Consent-gated analytics.
 *
 * Nothing here renders until the visitor has actively chosen "Accept all", so
 * no analytics request is made — and no analytics cookie is set — beforehand.
 * That is the part UK GDPR / PECR actually require, and it was missing: the
 * old banner recorded a choice that nothing ever read.
 *
 * Set NEXT_PUBLIC_ANALYTICS_ID to switch analytics on. With it unset (the
 * default, including at launch) this component renders nothing at all.
 */
export function Analytics() {
  const allowed = useAnalyticsAllowed();
  const id = process.env.NEXT_PUBLIC_ANALYTICS_ID;

  if (!allowed || !id) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
