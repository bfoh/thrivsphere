import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Support for under-18s",
  robots: { index: false, follow: false },
};

/**
 * Shown when the age gate refuses someone under 18.
 *
 * A refusal should still leave them somewhere useful. Someone who reached a
 * wellbeing service and was turned away is, if anything, more in need of a
 * next step than the average visitor — so this page is signposting, not a
 * closed door.
 */
export default function NotEligiblePage() {
  const options = [
    { name: "Childline", phone: "0800 1111", url: "https://www.childline.org.uk", detail: "Free, confidential, 24/7 for anyone under 19. You can call or chat online." },
    { name: "YoungMinds Textline", phone: "Text YM to 85258", url: "https://www.youngminds.org.uk", detail: "Free 24/7 text support if you'd rather not speak out loud." },
    { name: "The Mix", phone: "0808 808 4994", url: "https://www.themix.org.uk", detail: "Support for under-25s on anything — relationships, money, mental health." },
    { name: "Your GP", detail: "Your GP can refer you to NHS mental health support for young people (CAMHS)." },
    { name: "Emergency services", phone: "999", detail: "If you or someone else is in immediate danger, or life is at risk, call 999 now.", urgent: true },
  ];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 72px" }}>
      <h1 style={{ margin: "0 0 12px", fontSize: "clamp(24px,5vw,32px)", fontWeight: 800, color: "var(--navy)" }}>
        We can&apos;t support you here — but you&apos;re not stuck
      </h1>
      <p style={{ margin: "0 0 10px", fontSize: 16, lineHeight: 1.65, color: "var(--ink)" }}>
        ThrivSphere works with adults aged 18 and over, so we&apos;re not able to offer you
        sessions right now. That isn&apos;t a judgement about you, and it doesn&apos;t mean what
        you&apos;re going through doesn&apos;t matter.
      </p>
      <p style={{ margin: "0 0 30px", fontSize: 16, lineHeight: 1.65, color: "var(--ink)" }}>
        These services are for people your age and they&apos;re good. Please reach out to one of
        them.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {options.map((o) => (
          <div
            key={o.name}
            className="card"
            style={{ padding: "18px 22px", borderLeft: `4px solid ${o.urgent ? "var(--gold)" : "var(--teal)"}` }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "baseline" }}>
              <h2 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: "var(--navy)" }}>{o.name}</h2>
              {o.phone && (
                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--teal-deep)" }}>{o.phone}</span>
              )}
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 14.5, lineHeight: 1.55, color: "var(--ink)" }}>{o.detail}</p>
            {o.url && (
              <a href={o.url} target="_blank" rel="noopener noreferrer" className="tile-arrow" style={{ marginTop: 8 }}>
                Visit website <Icon name="arrow" size={15} stroke="var(--teal-deep)" />
              </a>
            )}
          </div>
        ))}
      </div>

      <p style={{ margin: "28px 0 0", fontSize: 13.5 }}>
        <Link href="/" style={{ color: "var(--teal-deep)", fontWeight: 700, textDecoration: "none" }}>
          Back to the ThrivSphere website
        </Link>
      </p>
    </div>
  );
}
