import Link from "next/link";
import { Icon } from "@/components/icons";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="no-print"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "var(--teal-deep)", fontWeight: 700, textDecoration: "none" }}
    >
      <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
        <Icon name="arrow" size={15} stroke="var(--teal-deep)" />
      </span>
      {label}
    </Link>
  );
}
