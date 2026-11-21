import type { MetadataRoute } from "next";
import { policyLinks, resources } from "@/data/site";
import { getPublishedPosts } from "@/lib/queries/blog";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thrivsphere.org";

/** Rebuilt hourly, and straight away when a post is published or taken down. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/team`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/services`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/how-it-works`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/pricing`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/book`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/faq`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/resources`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.7 },
  ];

  const content: MetadataRoute.Sitemap = [
    ...resources.map((r) => ({ url: `${SITE_URL}/resources/${r.slug}`, priority: 0.6 })),
  ];

  // A database hiccup should cost the sitemap its articles, not the whole sitemap.
  const posts = await getPublishedPosts().catch((err) => {
    console.error("[sitemap] blog posts unavailable", err);
    return [];
  });
  const articles: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: p.publishedAt,
    priority: 0.6,
  }));

  // Policies are low priority for search but should still be discoverable.
  const policies: MetadataRoute.Sitemap = policyLinks.map((p) => ({
    url: `${SITE_URL}${p.href}`,
    changeFrequency: "yearly" as const,
    priority: 0.3,
  }));

  return [...core, ...content, ...articles, ...policies].map((entry) => ({ lastModified, ...entry }));
}
