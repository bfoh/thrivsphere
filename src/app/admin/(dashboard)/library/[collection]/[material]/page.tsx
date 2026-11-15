import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/guard";
import { assetUrl } from "@/lib/library/assets";
import { kindMeta } from "@/lib/library/catalogue";
import { DOC_CSS } from "@/lib/library/convert/doc-html";
import { findCollection, findMaterial, getDocumentHtml, getLibrary } from "@/lib/library/manifest";
import { collectionHref, contentsOf, extentOf, materialHref, slideFromParam } from "@/lib/library/view";
import { BackLink } from "@/components/admin/BackLink";
import { KindBadge, fileSize, originalType } from "@/components/library/shared";
import { NotPublished } from "@/components/library/NotPublished";
import { DocumentReader } from "@/components/library/DocumentReader";
import { SlideViewer } from "@/components/library/SlideViewer";
import { PageStack } from "@/components/library/PageStack";

type Props = {
  params: Promise<{ collection: string; material: string }>;
  searchParams: Promise<{ slide?: string | string[]; q?: string | string[] }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { collection, material } = await params;
  const library = await getLibrary();
  const col = library ? findCollection(library, collection) : null;
  const mat = col ? findMaterial(col, material) : null;
  return {
    title: col && mat ? `${mat.title} · ${col.label ?? col.title}` : "Resource library",
    robots: { index: false, follow: false },
  };
}

/** One material: a guide to read, slides to teach from, or a PDF's pages. */
export default async function MaterialPage({ params, searchParams }: Props) {
  const { collection: slug, material: id } = await params;
  await requireCapability("library:read", {
    entity: "library",
    entityId: `${slug}/${id}`,
    action: "view",
    detail: `opened library material ${slug}/${id}`,
  });
  const library = await getLibrary();
  if (!library) return <NotPublished />;
  const col = findCollection(library, slug);
  const mat = col ? findMaterial(col, id) : null;
  if (!col || !mat) notFound();

  const sp = await searchParams;
  const query = (Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "").slice(0, 200);

  let html: string | null = null;
  if (mat.format === "document") {
    try {
      html = await getDocumentHtml(mat.html);
    } catch (err) {
      console.error("[library] document read failed", mat.html, err);
    }
  }

  const pdfHref = assetUrl(mat.pdf.asset, mat.pdf.name);

  return (
    <div className={`lib-page${mat.format === "slides" ? " is-wide" : ""}`}>
      <BackLink href={collectionHref(col.slug)} label={col.label ? `${col.label}: ${col.title}` : col.title} />

      <header className="lib-mat-head">
        <div>
          <KindBadge kind={mat.kind} step />
          <h1>
            {mat.title}
            {mat.subtitle && <span className="lib-mat-sub"> — {mat.subtitle}</span>}
          </h1>
          <p className="lib-mat-meta">
            {col.label ? `${col.label} · ` : ""}
            {col.title} · {extentOf(mat)}
          </p>
        </div>
        <div className="lib-actions">
          <a href={pdfHref} className="lib-btn-quiet" download>
            Download PDF <span className="lib-size">{fileSize(mat.pdf.bytes)}</span>
          </a>
          {mat.original.asset !== mat.pdf.asset && (
            <a href={assetUrl(mat.original.asset, mat.original.name)} className="lib-btn-quiet" download>
              {originalType(mat.original.name)} original <span className="lib-size">{fileSize(mat.original.bytes)}</span>
            </a>
          )}
          <a href={assetUrl(mat.pdf.asset)} className="lib-btn-quiet" target="_blank" rel="noopener">
            Print
          </a>
        </div>
      </header>

      {col.materials.length > 1 && (
        <nav className="lib-tabs" aria-label="Materials for this resource">
          {col.materials.map((m) => (
            <Link key={m.id} href={materialHref(col.slug, m.id)} className="lib-tab" aria-current={m.id === mat.id ? "page" : undefined}>
              <span className="lib-tab-step">{kindMeta(m.kind).step}</span>
              {m.title}
            </Link>
          ))}
        </nav>
      )}

      {mat.format === "document" &&
        (html ? (
          <>
            <style>{DOC_CSS}</style>
            <DocumentReader
              html={html}
              contents={contentsOf(mat.sections)}
              columnInches={mat.columnInches}
              header={mat.header}
              footer={mat.footer}
              initialQuery={query}
            />
          </>
        ) : (
          <p className="lib-empty">
            This document could not be shown just now. You can still <a href={pdfHref}>download the PDF</a>.
          </p>
        ))}

      {mat.format === "slides" && (
        <SlideViewer
          slides={mat.slides}
          aspect={mat.aspect}
          title={mat.title}
          initialSlide={slideFromParam(sp.slide, mat.slides.length)}
        />
      )}

      {mat.format === "pages" && <PageStack pages={mat.pages} aspect={mat.aspect} title={mat.title} />}
    </div>
  );
}
