import * as React from "react";
import Link from "next/link";
import { BackLink } from "./BackLink";

/**
 * The back office's shared parts. Styles live in admin.css; these keep the
 * markup the same everywhere so a page can't drift from the rest.
 */

/** The page frame. Wide for lists, tables and records; narrow for forms and reading. */
export function Page({ narrow = false, children }: { narrow?: boolean; children: React.ReactNode }) {
  return <div className={narrow ? "adm-page adm-page--narrow" : "adm-page"}>{children}</div>;
}

/** The title, an optional line under it, a way back, and the page's own buttons on the right. */
export function PageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <header className="adm-head">
      <div className="adm-head-text">
        {back && (
          <div className="adm-back">
            <BackLink href={back.href} label={back.label} />
          </div>
        )}
        <h1 className="adm-title">{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="adm-head-actions">{actions}</div>}
    </header>
  );
}

/** A section of a page: a white card with a title, an optional line under it and buttons on the right. */
export function Card({
  id,
  title,
  subtitle,
  actions,
  children,
  style,
}: {
  id?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section id={id} className="adm-card" style={style}>
      {(title || actions) && (
        <div className="adm-card-head">
          <div>
            {title && <h2 className="adm-card-title">{title}</h2>}
            {subtitle && <p className="adm-card-sub">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** A figure with its label. A link when there is somewhere to act on it. */
export function Stat({
  label,
  value,
  hint,
  href,
  tone,
  icon,
  trend,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  tone?: "danger";
  /** A small icon in the corner. */
  icon?: React.ReactNode;
  /** How it compares, e.g. with this time last month. */
  trend?: { text: string; direction: "up" | "down" | "flat" } | null;
}) {
  const body = (
    <>
      <span className="adm-stat-top">
        <span className="adm-stat-label">{label}</span>
        {icon && <span className="adm-stat-icon">{icon}</span>}
      </span>
      <span className="adm-stat-value">{value}</span>
      {trend && (
        <span className="adm-stat-trend" data-direction={trend.direction}>
          <span aria-hidden="true">{trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"}</span> {trend.text}
        </span>
      )}
      {hint && <span className="adm-stat-hint">{hint}</span>}
    </>
  );
  return href ? (
    <Link href={href} className="adm-stat" data-tone={tone}>
      {body}
    </Link>
  ) : (
    <div className="adm-stat" data-tone={tone}>
      {body}
    </div>
  );
}

export function Stats({ children }: { children: React.ReactNode }) {
  return <div className="adm-stats">{children}</div>;
}

export type Tone = "neutral" | "ok" | "info" | "warn" | "danger" | "gold";

/** A coloured status label. The words carry the meaning; colour only helps scanning. */
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className="adm-badge" data-tone={tone === "neutral" ? undefined : tone}>
      {children}
    </span>
  );
}

/** Links that switch between views of one page (All / Mine, Open / All, quarters). */
export function Tabs({
  label,
  items,
}: {
  label: string;
  items: { label: React.ReactNode; href: string; active: boolean; count?: number }[];
}) {
  return (
    <nav aria-label={label} className="adm-tabs">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="adm-tab" aria-current={i.active ? "page" : undefined}>
          {i.label}
          {i.count !== undefined && <span className="adm-tab-count">{i.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

/** A message in a coloured box: "Saved", a warning, or something the person must know. */
export function Notice({
  tone = "info",
  children,
  live = false,
}: {
  tone?: "ok" | "info" | "warn" | "danger";
  children: React.ReactNode;
  /** Announce it to screen readers when it appears (form results). */
  live?: boolean;
}) {
  return (
    <div className="adm-notice" data-tone={tone} role={live ? (tone === "danger" ? "alert" : "status") : undefined}>
      {children}
    </div>
  );
}

/** The box a table sits in; on small screens the table scrolls inside it. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="adm-table-wrap">{children}</div>;
}

/** A labelled form field with an optional hint and error under it. */
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="adm-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="adm-hint">{hint}</p>}
      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Layout for a form control's style prop: sizing only. Colour, border and size come from admin.css. */
export const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", fontFamily: "inherit" };
