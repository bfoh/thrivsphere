import Image from "next/image";
import { assetUrl } from "@/lib/library/assets";
import { kindMeta, type MaterialKind } from "@/lib/library/catalogue";

/**
 * Small pieces shared by the library pages. Server-safe: no hooks, no state.
 */

export const KIND_TONE: Record<MaterialKind, { bg: string; fg: string; dot: string }> = {
  "practitioner-guide": { bg: "rgba(31,58,95,0.08)", fg: "var(--navy)", dot: "#1f3a5f" },
  presentation: { bg: "rgba(212,175,55,0.16)", fg: "#6f5508", dot: "#d4af37" },
  "learning-guide": { bg: "rgba(79,168,168,0.14)", fg: "#2c6e6e", dot: "#4fa8a8" },
  "activity-worksheet": { bg: "rgba(168,195,160,0.26)", fg: "#3f5f37", dot: "#7fa576" },
  "review-form": { bg: "rgba(232,200,211,0.4)", fg: "#7a3b52", dot: "#c98aa1" },
};

export function KindBadge({ kind, step = false }: { kind: MaterialKind; step?: boolean }) {
  const meta = kindMeta(kind);
  const tone = KIND_TONE[kind];
  return (
    <span className="lib-kind" style={{ background: tone.bg, color: tone.fg }}>
      <span aria-hidden className="lib-kind-dot" style={{ background: tone.dot }} />
      {step ? `${meta.step} · ${meta.label}` : meta.label}
    </span>
  );
}

/** A cover or thumbnail from the library, at a fixed shape so the grid never jumps. */
export function Cover({
  asset,
  alt,
  aspect = 16 / 9,
  width = 640,
  priority = false,
  fit = "cover",
}: {
  asset: string;
  alt: string;
  aspect?: number;
  width?: number;
  priority?: boolean;
  fit?: "cover" | "contain";
}) {
  return (
    <span className="lib-cover" style={{ aspectRatio: String(aspect) }}>
      <Image
        src={assetUrl(asset)}
        alt={alt}
        width={width}
        height={Math.round(width / aspect)}
        unoptimized
        priority={priority}
        style={{ objectFit: fit }}
      />
    </span>
  );
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-GB")} ${n === 1 ? one : many}`;

export function fileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "Word document", "PowerPoint" or "PDF", from the original's file name. */
export function originalType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext === "docx" ? "Word" : ext === "pptx" ? "PowerPoint" : ext === "pdf" ? "PDF" : "Original";
}
