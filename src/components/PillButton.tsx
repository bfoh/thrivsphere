import * as React from "react";
import { Icon } from "./icons";

type Variant = "gold" | "teal" | "ghost";

export function PillButton({
  children,
  variant = "gold",
  size = "md",
  href,
  onClick,
  icon,
  style,
}: {
  children: React.ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  href?: string;
  onClick?: () => void;
  icon?: string;
  style?: React.CSSProperties;
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
  const common = { className: cls, style: { padding: pad, fontSize: fs, ...style } };
  return (
    <span className="pillWrap">
      {href ? (
        <a href={href} {...common}>
          {inner}
        </a>
      ) : (
        <button {...common} onClick={onClick}>
          {inner}
        </button>
      )}
    </span>
  );
}
