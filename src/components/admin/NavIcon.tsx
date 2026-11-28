import * as React from "react";
import type { NavIconName } from "@/lib/admin-nav";

type Name = NavIconName | "lock" | "search" | "menu" | "close";

/**
 * Line icons for the back office, drawn on one 24px grid with one stroke
 * weight so the menu reads as a set.
 */
const PATHS: Record<Name, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="8.5" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.6" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.6" />
      <rect x="3.5" y="15" width="7" height="5.5" rx="1.6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.5 13.5v4.5a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4.5" />
      <path d="M3.5 13.5 6 6a2 2 0 0 1 1.9-1.4h8.2A2 2 0 0 1 18 6l2.5 7.5" />
      <path d="M3.5 13.5h4.8l1.4 2.4h4.6l1.4-2.4h4.8" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M3 19.5c.6-3.3 3-5.5 6-5.5s5.4 2.2 6 5.5" />
      <path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M18 14.5c1.6.8 2.6 2.6 3 5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.2 19.5 6v5.6c0 4.4-3 8-7.5 9.2-4.5-1.2-7.5-4.8-7.5-9.2V6z" />
      <path d="M9 12l2.2 2.2L15.2 10" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4.5" width="14" height="16.5" rx="2" />
      <rect x="8.5" y="2.8" width="7" height="3.6" rx="1.1" />
      <path d="M8.5 11h7M8.5 15h4.5" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.8C10 5.3 7.2 4.8 3.5 5.2v13c3.7-.4 6.5.1 8.5 1.6 2-1.5 4.8-2 8.5-1.6v-13c-3.7-.4-6.5.1-8.5 1.6z" />
      <path d="M12 6.8v13" />
    </>
  ),
  pen: (
    <>
      <path d="M4 20h4L19.2 8.8a2.6 2.6 0 0 0-3.7-3.7L4.3 16.3z" />
      <path d="M13.8 6.8l3.6 3.6" />
    </>
  ),
  megaphone: (
    <>
      <path d="M3.5 10v4a1 1 0 0 0 1 1h2.7L14 19V5L7.2 9H4.5a1 1 0 0 0-1 1z" />
      <path d="M17.5 8.8a4.5 4.5 0 0 1 0 6.4M7.5 15.2 9 20" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12.4V4.5a1 1 0 0 1 1-1h7.9l8.6 8.6-8.9 8.9z" />
      <circle cx="8" cy="8" r="1.4" />
    </>
  ),
  percent: (
    <>
      <path d="M18.5 5.5l-13 13" />
      <circle cx="7.2" cy="7.2" r="2.4" />
      <circle cx="16.8" cy="16.8" r="2.4" />
    </>
  ),
  trend: (
    <>
      <path d="M3.5 17l5.5-5.5 4 4 7.5-7.5" />
      <path d="M15 8h5.5v5.5" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 2.8h12v18.4l-3-1.9-3 1.9-3-1.9-3 1.9z" />
      <path d="M9 8h6M9 11.5h6M9 15h3.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 3.5v16.5h16.5" />
      <path d="M8.5 16v-4M12.5 16V8M16.5 16v-6" />
    </>
  ),
  team: (
    <>
      <circle cx="10" cy="8" r="3.8" />
      <path d="M3.5 20c.6-3.7 3.3-6 6.5-6 1.4 0 2.7.4 3.8 1.2" />
      <path d="M15.5 18.2l2 2 4-4.2" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3.5" y="7" width="17" height="13" rx="2" />
      <path d="M9 7V5.5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2V7M3.5 12.5h17" />
    </>
  ),
  pulse: <path d="M3 12h4l2.6-6.5 4.8 13 2.6-6.5h4" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.3-4.3" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
};

export function NavIcon({ name, size = 18 }: { name: Name; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
