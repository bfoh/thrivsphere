import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { ArticleView } from "@/components/blog/ArticleView";
import { brand } from "@/data/site";
import { getPublishedPost, type PublicPost } from "@/lib/queries/blog";
import { isValidSlug } from "@/lib/blog-rules";

/**
 * One article. Only a post's published version is ever read, so a draft or a
 * version still waiting for review returns "not found" to the public.
 */
export const revalidate = 300;

/** Nothing is built in advance: each article is made on its first visit, then cached. */
export function generateStaticParams() {
  return [];
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thrivsphere.org";

async function load(slug: string) {
  return isValidSlug(slug) ? getPublishedPost(slug) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await load(slug);
  if (!post) return { title: "Article" };
  const description = post.metaDescription || post.excerpt;
  const image = post.coverImage ? `/blog/images/${post.coverImage}` : undefined;
  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      url: `/blog/${post.slug}`,
      title: post.title,
      description,
      publishedTime: post.firstPublishedAt.toISOString(),
      modifiedTime: post.publishedAt.toISOString(),
      section: post.category,
      ...(image ? { images: [{ url: image, alt: post.coverAlt ?? "" }] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title: post.title, description },
  };
}

function jsonLd(post: PublicPost) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription || post.excerpt,
    datePublished: post.firstPublishedAt.toISOString(),
    dateModified: post.publishedAt.toISOString(),
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    articleSection: post.category,
    ...(post.coverImage ? { image: `${SITE_URL}/blog/images/${post.coverImage}` } : {}),
    author: post.authorName === "ThriveSphere team" ? { "@type": "Organization", name: brand.name } : { "@type": "Person", name: post.authorName },
    publisher: { "@type": "Organization", name: brand.name, url: SITE_URL },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await load(slug);
  if (!post) notFound();

  return (
    <PageShell eyebrow={post.category} title={post.title} watermark="Article">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(post)).replace(/</g, "\\u003c") }} />
      <ArticleView
        title={post.title}
        body={post.body}
        sources={post.sources}
        coverSrc={post.coverImage ? `/blog/images/${post.coverImage}` : null}
        coverAlt={post.coverAlt}
        authorName={post.authorName}
        reviewerName={post.reviewerName}
        firstPublishedAt={post.firstPublishedAt}
        publishedAt={post.publishedAt}
        readTime={post.readTime}
      />
    </PageShell>
  );
}
