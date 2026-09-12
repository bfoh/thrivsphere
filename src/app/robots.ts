import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thrivsphere.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Reserved for the Stage 2 client portal and admin area — client records
      // must never be crawled.
      disallow: ["/admin", "/portal", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
