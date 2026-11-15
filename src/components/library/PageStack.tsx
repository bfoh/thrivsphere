import Image from "next/image";
import { assetUrl } from "@/lib/library/assets";
import type { PageRef } from "@/lib/library/types";

/** A PDF's pages, one under another, each with an anchor (`#page-3`) for search links. */
export function PageStack({ pages, aspect, title }: { pages: PageRef[]; aspect: number; title: string }) {
  const width = 1700;
  return (
    <ol className="lib-pages" aria-label={title}>
      {pages.map((p, i) => (
        <li key={p.image} id={`page-${i + 1}`} className="lib-pages-item">
          <span className="lib-pages-n">Page {i + 1}</span>
          <span className="lib-pages-img" style={{ aspectRatio: String(aspect) }}>
            <Image
              src={assetUrl(p.image)}
              alt={`${title}, page ${i + 1} of ${pages.length}`}
              width={width}
              height={Math.round(width / aspect)}
              unoptimized
              priority={i === 0}
            />
          </span>
        </li>
      ))}
    </ol>
  );
}
