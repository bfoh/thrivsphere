import type { Metadata } from "next";
import { requireCapability } from "@/lib/guard";
import { getPublishedServices } from "@/lib/queries/catalogue";
import { getPublishedPosts } from "@/lib/queries/blog";
import { listAssets } from "@/lib/queries/marketing";
import { DRAWABLE } from "@/lib/graphics/resolve";
import { GraphicMaker } from "@/components/admin/marketing/GraphicMaker";
import { h1, lead } from "@/components/admin/marketing/ui";

export const metadata: Metadata = { title: "Make a graphic", robots: { index: false, follow: false } };

/** Branded images from templates, sized for each channel. */
export default async function GraphicsPage() {
  await requireCapability("marketing:write", { entity: "marketing_assets", action: "view", detail: "opened the graphics maker" });
  const [services, posts, photos] = await Promise.all([getPublishedServices(), getPublishedPosts(100), listAssets({ photosOnly: true })]);
  return (
    <div className="adm-page">
      <h1 className="adm-title" style={h1}>Make a graphic</h1>
      <p style={lead}>
        Branded images in ThriveSphere&apos;s fonts and colours, sized for each channel. Only colour pairs that are easy to
        read are used. Keep the words short: the image should add to the post, not repeat all of it.
      </p>
      <GraphicMaker
        services={services.map((s) => ({ value: s.slug, label: s.title }))}
        posts={posts.map((p) => ({ value: p.slug, label: p.title }))}
        photos={photos.filter(({ asset }) => DRAWABLE.includes(asset.contentType)).map(({ asset }) => ({ value: asset.id, label: asset.title }))}
      />
    </div>
  );
}
