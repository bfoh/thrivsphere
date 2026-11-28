import type { Metadata } from "next";
import { requireCapability } from "@/lib/guard";
import { Section } from "@/components/admin/RecordUI";
import { BackLink } from "@/components/admin/BackLink";
import { NewPostForm } from "@/components/admin/blog/BlogForms";

export const metadata: Metadata = { title: "New blog post", robots: { index: false, follow: false } };

export default async function NewBlogPostPage() {
  await requireCapability("blog:write", { entity: "blog_posts", action: "view", detail: "opened the new blog post form" });
  return (
    <div className="adm-page adm-page--narrow">
      <BackLink href="/admin/blog" label="Blog" />
      <h1 className="adm-title" style={{ margin: "12px 0 6px" }}>New blog post</h1>
      <p style={{ margin: "0 0 22px", fontSize: 14, lineHeight: 1.6, color: "var(--navy-soft)" }}>
        This starts a draft. Nothing is on the website until it has been reviewed and published.
      </p>
      <Section title="Start a draft">
        <NewPostForm />
      </Section>
    </div>
  );
}
