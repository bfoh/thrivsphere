import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/guard";
import { BackLink } from "@/components/admin/BackLink";
import { ArticleView } from "@/components/blog/ArticleView";
import { getPostForEditor, toContent } from "@/lib/queries/blog";
import { readingTime } from "@/lib/blog-rules";

export const metadata: Metadata = { title: "Preview blog post", robots: { index: false, follow: false } };

/**
 * A version of a post exactly as readers would see it: the same article view
 * the website uses. The current version unless `?v=` names another.
 */
export default async function BlogPreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireCapability("blog:write", { entity: "blog_posts", entityId: id, action: "view", detail: "previewed a blog post" });

  const data = await getPostForEditor(id);
  if (!data) notFound();
  const wanted = Number((await searchParams).v);
  const entry = Number.isInteger(wanted) ? data.versions.find((v) => v.version.number === wanted) : data.current;
  if (!entry) notFound();

  const c = toContent(entry.version);
  const isLive = entry.version.id === data.post.publishedVersionId;
  const approval = data.reviews.find((r) => r.versionId === entry.version.id && r.decision === "approved");

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 24px 72px" }}>
      <BackLink href={`/admin/blog/${id}`} label="Back to the post" />
      <p
        role="status"
        style={{ margin: "14px 0 24px", padding: "10px 16px", borderRadius: 12, fontSize: 13.5, fontWeight: 700, background: isLive ? "rgba(63,122,58,0.1)" : "rgba(212,175,55,0.12)", color: "var(--navy)" }}
      >
        Preview of version {entry.version.number}. {isLive ? "This is the version on the website." : "This version is not on the website."}
      </p>
      <div style={{ background: "#fff", borderRadius: 20, padding: "34px 30px", boxShadow: "0 1px 0 rgba(31,58,95,0.06)" }}>
        <p className="eyebrow" style={{ margin: "0 0 8px" }}>{c.category}</p>
        <h1 style={{ margin: "0 0 22px", fontSize: 34, lineHeight: 1.15, fontWeight: 800, color: "var(--navy)" }}>{c.title || "Untitled"}</h1>
        <ArticleView
          title={c.title}
          body={c.body}
          sources={c.sources}
          coverSrc={c.coverImage ? `/api/admin/blog/images/${c.coverImage}` : null}
          coverAlt={c.coverAlt}
          authorName={data.authorName ?? "ThriveSphere team"}
          reviewerName={approval ? approval.reviewerName || approval.reviewerEmail : null}
          firstPublishedAt={data.post.firstPublishedAt}
          publishedAt={isLive ? data.post.publishedAt : null}
          readTime={readingTime(c.body)}
        />
      </div>
    </div>
  );
}
