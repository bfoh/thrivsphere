import * as React from "react";

type IconProps = { size?: number; className?: string; stroke?: string };

const base = (size: number, stroke: string): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke,
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function Icon({ name, size = 24, stroke = "currentColor" }: IconProps & { name: string }) {
  const p = base(size, stroke);
  switch (name) {
    case "heart":
      return (
        <svg {...p}>
          <path d="M12 20s-7-4.5-9.5-9A4.6 4.6 0 0 1 12 6a4.6 4.6 0 0 1 9.5 5C19 15.5 12 20 12 20z" />
        </svg>
      );
    case "spark":
      return (
        <svg {...p}>
          <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
          <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
        </svg>
      );
    case "compass":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1 5.1-2.1z" />
          <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "users":
      return (
        <svg {...p}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <path d="M16 6.2a3 3 0 0 1 0 5.8M17 14.5a5.3 5.3 0 0 1 3.5 4.5" />
        </svg>
      );
    case "lotus":
      return (
        <svg {...p}>
          <path d="M12 4c1.6 1.8 2.4 3.9 2.4 6.2 0 .9-.2 1.7-.5 2.5-.6-.6-1.3-1.8-1.9-3.4-.6 1.6-1.3 2.8-1.9 3.4-.3-.8-.5-1.6-.5-2.5C9.6 7.9 10.4 5.8 12 4z" />
          <path d="M4.5 11.5c2.3.1 4 .9 5.1 2.2M19.5 11.5c-2.3.1-4 .9-5.1 2.2" />
          <path d="M4 15c2.4 3 5 4.5 8 4.5s5.6-1.5 8-4.5" />
        </svg>
      );
    case "book":
      return (
        <svg {...p}>
          <path d="M12 6.5C10.5 5.3 8.5 5 6 5.2A1 1 0 0 0 5 6.2v11a1 1 0 0 0 1.1 1c2.3-.2 4.3.1 5.9 1.3 1.6-1.2 3.6-1.5 5.9-1.3a1 1 0 0 0 1.1-1v-11a1 1 0 0 0-1-1c-2.5-.2-4.5.1-6 1.3z" />
          <path d="M12 6.5v12.3" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...p}>
          <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
          <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 12.5h17" />
        </svg>
      );
    case "webinar":
      return (
        <svg {...p}>
          <rect x="3" y="4.5" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16.5V20M9.5 10.5l4-2-4-2v4z" />
        </svg>
      );
    case "library":
      return (
        <svg {...p}>
          <path d="M5 4.5h3v15H5zM10.5 4.5h3v15h-3z" />
          <path d="M16.2 5l3 .8-3.5 13.8-2.9-.8" />
        </svg>
      );
    case "shield":
      return (
        <svg {...p}>
          <path d="M12 3l7 2.5v5c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9v-5L12 3z" />
          <path d="M9.5 12l1.8 1.8L15 10" />
        </svg>
      );
    case "sun":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
        </svg>
      );
    case "chat":
      return (
        <svg {...p}>
          <path d="M4 5.5h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...p}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case "check":
      return (
        <svg {...p}>
          <path d="M5 12.5l4.5 4.5L19 7" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...p}>
          <path d="M6 9.5l6 6 6-6" />
        </svg>
      );
    case "menu":
      return (
        <svg {...p}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case "close":
      return (
        <svg {...p}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case "mail":
      return (
        <svg {...p}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="M4 7l8 6 8-6" />
        </svg>
      );
    default:
      return null;
  }
}

export function Logo({ height = 46 }: { height?: number }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/images/thrivsphere-logo.png"
      alt="ThrivSphere Wellbeing CIC"
      style={{ height, width: "auto", display: "block" }}
    />
  );
}
