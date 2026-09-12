import type { MetadataRoute } from "next";
import { policyLinks, posts, resources } from "@/data/site";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thrivsphere.org.uk";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/services`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/pricing`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/book`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/resources`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.7 },
  ];

  const content: MetadataRoute.Sitemap = [
    ...resources.map((r) => ({ url: `${SITE_URL}/resources/${r.slug}`, priority: 0.6 })),
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, priority: 0.6 })),
  ];

  // Policies are low priority for search but should still be discoverable.
  const policies: MetadataRoute.Sitemap = policyLinks.map((p) => ({
    url: `${SITE_URL}${p.href}`,
    changeFrequency: "yearly" as const,
    priority: 0.3,
  }));

  return [...core, ...content, ...policies].map((entry) => ({ lastModified, ...entry }));
}
