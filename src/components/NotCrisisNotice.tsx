import * as React from "react";
import { Icon } from "./icons";

/**
 * "We are not an emergency service" notice with the crisis numbers.
 *
 * The brief requires this to be unmissable, so it is a solid navy block with
 * the numbers as tappable `tel:` links rather than a quiet footnote. Used on
 * Home, Contact and Book.
 */
export function NotCrisisNotice({ style }: { style?: React.CSSProperties }) {
  return (
    <aside
      aria-label="Emergency and crisis information"
      style={{
        background: "var(--navy)",
        borderRadius: 16,
        padding: "22px 26px",
        color: "#e7eefa",
        ...style,
      }}
    >
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: 17,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 9,
          fontWeight: 800,
        }}
      >
        <Icon name="shield" size={20} stroke="var(--gold)" />
        ThrivSphere is not an emergency or crisis service
      </h2>
      <p style={{ margin: "0 0 14px", fontSize: 14.5, lineHeight: 1.6, maxWidth: 620 }}>
        We are a non-clinical wellbeing, education and support service. We do not provide crisis,
        emergency or out-of-hours care, and we cannot respond to urgent messages between sessions.
        If you need help right now, please use one of these — they are free and staffed 24/7.
      </p>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "flex",
          flexWrap: "wrap",
          gap: "10px 26px",
          fontSize: 14.5,
        }}
      >
        <CrisisItem label="Immediate danger" value="999" href="tel:999" />
        <CrisisItem label="Samaritans, 24/7" value="116 123" href="tel:116123" />
        <CrisisItem label="Domestic abuse" value="0808 2000 247" href="tel:08082000247" />
        <CrisisItem label="Men's Advice Line" value="0808 8010 327" href="tel:08088010327" />
        <CrisisItem label="Urgent NHS mental health" value="111" href="tel:111" />
      </ul>
    </aside>
  );
}

function CrisisItem({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <li style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 12, color: "#9db0c9" }}>{label}</span>
      <a href={href} style={{ color: "#fff", fontWeight: 800, textDecoration: "none", fontSize: 16 }}>
        {value}
      </a>
    </li>
  );
}
