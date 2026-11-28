import Image from "next/image";
import type { Photo } from "@/data/photos";

/**
 * A photograph from src/data/photos.ts, always at its own proportions: never
 * cropped, stretched or filtered. Rounded corners and a soft shadow (styled by
 * .site-photo in globals.css) tie it to the site's cards.
 *
 * Lazy-loaded with a blurred preview, which suits every current placement:
 * none of them is in the first screen of its page.
 *
 * `sizes` is required because it decides which width the browser downloads;
 * give the photo's real rendered width at each breakpoint.
 */
export function SitePhoto({ photo, sizes, className }: { photo: Photo; sizes: string; className?: string }) {
  return (
    <Image
      src={photo.src}
      alt={photo.alt}
      sizes={sizes}
      placeholder="blur"
      className={className ? `site-photo ${className}` : "site-photo"}
    />
  );
}
