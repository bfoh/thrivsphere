import { brand } from "@/data/site";
import { getPublishedPosts } from "@/lib/queries/blog";

/** The blog as an RSS feed, for readers and newsletter tools. */
export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thrivsphere.org";

const xml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export async function GET() {
  const posts = await getPublishedPosts(50);
  const items = posts
    .map(
      (p) => `    <item>
      <title>${xml(p.title)}</title>
      <link>${SITE_URL}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${p.slug}</guid>
      <pubDate>${p.firstPublishedAt.toUTCString()}</pubDate>
      <category>${xml(p.category)}</category>
      <description>${xml(p.excerpt)}</description>
    </item>`
    )
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(`${brand.name} blog`)}</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>Wellbeing insights, gentle guidance and stories of resilience.</description>
    <language>en-gb</language>
${items}
  </channel>
</rss>`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
