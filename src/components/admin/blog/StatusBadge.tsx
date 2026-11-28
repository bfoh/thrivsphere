import { STATUS_LABEL, type BlogStatus } from "@/lib/blog-rules";

export const STATUS_COLOUR: Record<BlogStatus, string> = {
  draft: "var(--navy-soft)",
  in_review: "var(--a-gold)",
  changes_requested: "var(--a-danger)",
  approved: "var(--teal-deep)",
  scheduled: "var(--teal-deep)",
  published: "var(--a-ok)",
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
