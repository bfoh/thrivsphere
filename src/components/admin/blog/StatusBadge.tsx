import { STATUS_LABEL, type BlogStatus } from "@/lib/blog-rules";

export const STATUS_COLOUR: Record<BlogStatus, string> = {
  draft: "var(--navy-soft)",
  in_review: "#8a6d12",
  changes_requested: "#a1421c",
  approved: "var(--teal-deep)",
  scheduled: "var(--teal-deep)",
  published: "#3f7a3a",
  archived: "var(--navy-soft)",
};

export function StatusBadge({ status }: { status: BlogStatus }) {
  const c = STATUS_COLOUR[status];
  return (
    <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: c, border: `1px solid ${c}`, borderRadius: 50, padding: "3px 10px", whiteSpace: "nowrap" }}>
      {STATUS_LABEL[status]}
    </span>
  );
}
