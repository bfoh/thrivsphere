import { Icon } from "./icons";
import { whatsappHref } from "@/lib/whatsapp";

/**
 * WhatsApp Business contact (checklist §9).
 *
 * Renders nothing until NEXT_PUBLIC_WHATSAPP_NUMBER is set, so the business
 * number can be switched on without a code change.
 */
export function WhatsAppLink({
  variant = "card",
  heading: Heading = "h2",
}: {
  variant?: "card" | "footer";
  heading?: "h2" | "h3";
}) {
  const href = whatsappHref(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
  if (!href) return null;

  if (variant === "footer") {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "inherit", textDecoration: "none" }}>
        <Icon name="chat" size={15} /> WhatsApp us
      </a>
    );
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <Heading style={{ margin: "0 0 10px", fontSize: 18, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="chat" size={20} stroke="var(--teal)" /> WhatsApp
      </Heading>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="pill pill-teal"
        style={{ padding: "10px 20px", fontSize: 13.5 }}
      >
        Message us on WhatsApp <Icon name="arrow" size={16} />
      </a>
      <p style={{ margin: "12px 0 0", fontSize: 13.5, lineHeight: 1.55, color: "var(--navy-soft)" }}>
        For general enquiries and arranging appointments. Please don&apos;t send health details by
        WhatsApp.
      </p>
    </div>
  );
}
