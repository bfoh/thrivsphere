import * as React from "react";
import { Icon } from "./icons";
import Link from "next/link";

type Variant = "gold" | "teal" | "ghost";

export function PillButton({
  children,
  variant = "gold",
  size = "md",
  href,
  onClick,
  icon,
  style,
  type,
  disabled,
}: {
  children: React.ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  href?: string;
  onClick?: () => void;
  icon?: string;
  style?: React.CSSProperties;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}) {
  const pad = size === "lg" ? "16px 30px" : size === "sm" ? "9px 18px" : "13px 24px";
  const fs = size === "lg" ? 15.5 : size === "sm" ? 13 : 14.5;
  const cls = `pill pill-${variant}`;
  const inner = (
    <>
      {children}
      {icon && <Icon name={icon} size={17} />}
    </>
  );
  const common = {
    className: cls,
    style: {
      padding: pad,
      fontSize: fs,
      ...(disabled ? { opacity: 0.6, cursor: "not-allowed" as const } : null),
      ...style,
    },
  };
  return (
    <span className="pillWrap">
      {href ? (
        <Link href={href} {...common}>
          {inner}
        </Link>
      ) : (
        <button {...common} type={type} onClick={onClick} disabled={disabled}>
          {inner}
        </button>
      )}
    </span>
  );
}
