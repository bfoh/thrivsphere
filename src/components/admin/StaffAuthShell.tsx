import Link from "next/link";
import { Logo } from "@/components/icons";

/**
 * The frame around the staff sign-in and join pages.
 *
 * No crisis bar here, unlike every client-facing page: these are for people
 * delivering the service, not seeking it.
 */
export function StaffAuthShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--navy)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "56px 20px",
      }}
    >
      <div style={{ background: "#fff", borderRadius: 12, padding: 8, marginBottom: 26 }}>
        <Logo height={44} />
      </div>

      <h1
        style={{
          margin: "0 0 8px",
          fontSize: "clamp(22px, 5vw, 28px)",
          fontWeight: 800,
          color: "#fff",
          textAlign: "center",
          letterSpacing: "-0.015em",
        }}
      >
        {title}
      </h1>
      <p style={{ margin: "0 0 30px", fontSize: 14.5, color: "#a9bcd4", textAlign: "center", maxWidth: 420, lineHeight: 1.6 }}>
        {intro}
      </p>

      {children}

      <p style={{ margin: "28px 0 0", fontSize: 13.5, color: "#a9bcd4", textAlign: "center", maxWidth: 420, lineHeight: 1.6 }}>
        Looking for your own appointments and messages?{" "}
        <Link href="/sign-in" style={{ color: "#8fd0d0", fontWeight: 700 }}>
          Client sign in
        </Link>
      </p>

      <p style={{ margin: "14px 0 0", fontSize: 13 }}>
        <Link href="/" style={{ color: "#8fd0d0", textDecoration: "none" }}>
          Back to the website
        </Link>
      </p>
    </main>
  );
}
