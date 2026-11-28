"use client";

import * as React from "react";
import Link from "next/link";
import Form from "next/form";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/icons";
import { activeNavHref, type NavIconName } from "@/lib/admin-nav";
import { NavIcon } from "./NavIcon";

export type ShellItem = {
  label: string;
  href: string;
  icon: NavIconName;
  /** Waiting work, shown beside the entry. Left out when there is none. */
  count?: number;
  /** "danger" for counts that should never wait, such as safeguarding. */
  tone?: "danger";
};
export type ShellGroup = { key: string; label: string; items: ShellItem[] };

/**
 * The back office's frame: a sidebar of sections on the left, a slim bar on
 * top with where you are, client search and your account.
 *
 * On screens under 1024px the sidebar slides in from the left behind a menu
 * button. It closes on a link, on the backdrop and on Escape, and focus moves
 * into it on opening and back to the button on closing.
 *
 * Navigation only. Every page still guards itself; the menu is built on the
 * server from the person's capabilities and passed in.
 */
export function AdminShell({
  groups,
  userName,
  roleLabel,
  canSearchClients,
  userMenu,
  children,
}: {
  groups: ShellGroup[];
  userName: string;
  roleLabel: string;
  canSearchClients: boolean;
  userMenu: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const menuButton = React.useRef<HTMLButtonElement>(null);
  const closeButton = React.useRef<HTMLButtonElement>(null);

  const all = groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));
  const activeHref = activeNavHref(pathname, all.map((i) => i.href));
  const active = all.find((i) => i.href === activeHref);

  const close = React.useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) menuButton.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = before;
    };
  }, [open, close]);

  return (
    <div className="adm">
      <aside id="adm-sidebar" className="adm-side no-print" data-open={open} aria-label="Back office">
        <div className="adm-side-brand">
          <Link href="/admin" aria-label="ThriveSphere back office, dashboard" style={{ display: "flex" }} onClick={() => setOpen(false)}>
            <Logo height={30} />
          </Link>
          <span className="adm-side-brand-label">Back office</span>
          <button
            ref={closeButton}
            type="button"
            className="adm-menu-btn"
            style={{ marginLeft: "auto", marginRight: -8 }}
            aria-label="Close menu"
            onClick={() => close(true)}
          >
            <NavIcon name="close" size={20} />
          </button>
        </div>

        <nav className="adm-side-nav" aria-label="Back office sections">
          {groups.map((g) => (
            <div key={g.key} className="adm-nav-group">
              <p className="adm-nav-heading" id={`nav-${g.key}`}>
                {g.label}
              </p>
              <ul className="adm-nav-list" aria-labelledby={`nav-${g.key}`}>
                {g.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="adm-nav-link"
                      aria-current={item.href === activeHref ? "page" : undefined}
                      onClick={() => setOpen(false)}
                    >
                      <NavIcon name={item.icon} />
                      <span>{item.label}</span>
                      {item.count ? (
                        <span className="adm-nav-count" data-tone={item.tone}>
                          {item.count > 99 ? "99+" : item.count}
                          <span className="visually-hidden"> waiting</span>
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="adm-side-foot">
          <NavIcon name="lock" size={15} />
          <span>Confidential · every record opened is logged</span>
        </div>
      </aside>

      <button
        type="button"
        className="adm-scrim no-print"
        data-open={open}
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => close(false)}
      />

      <div className="adm-main">
        <header className="adm-top no-print">
          <button
            ref={menuButton}
            type="button"
            className="adm-menu-btn"
            aria-label="Open menu"
            aria-controls="adm-sidebar"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <NavIcon name="menu" size={22} />
          </button>

          {active && (
            <div className="adm-crumb">
              <span className="adm-crumb-group">{active.group}</span>
              <span className="adm-crumb-sep" aria-hidden="true">
                /
              </span>
              <span className="adm-crumb-page">{active.label}</span>
            </div>
          )}

          {canSearchClients && (
            <Form action="/admin/clients" role="search" className="adm-top-search">
              <NavIcon name="search" size={16} />
              <input
                type="search"
                name="q"
                placeholder="Search clients by name or email"
                aria-label="Search clients by name or email"
                autoComplete="off"
              />
            </Form>
          )}

          <div className="adm-user">
            <div className="adm-user-text">
              <span className="adm-user-name">{userName}</span>
              <span className="adm-user-role">{roleLabel}</span>
            </div>
            {userMenu}
          </div>
        </header>

        <main id="main" className="adm-content">
          {children}
        </main>
      </div>
    </div>
  );
}
