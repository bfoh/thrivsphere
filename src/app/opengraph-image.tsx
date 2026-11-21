import { renderGraphic } from "@/lib/graphics/render";
import { seedKit } from "@/lib/brand-kit";
import { brand } from "@/data/site";

/**
 * The picture shown when someone shares a link to the website. Drawn once at
 * build time in the brand's own style.
 */
export const alt = `${brand.name}: ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const kit = seedKit();
  const png = await renderGraphic({
    input: {
      template: "tip",
      size: "facebook",
      theme: "navy",
      values: { eyebrow: "Online wellbeing support", headline: brand.tagline, body: kit.boilerplates.short },
    },
    kit,
  });
  return new Response(Buffer.from(png), { headers: { "Content-Type": contentType } });
}
