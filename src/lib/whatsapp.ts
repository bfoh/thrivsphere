/**
 * WhatsApp Business click-to-chat.
 *
 * The business number is not yet issued, so the link is driven by
 * NEXT_PUBLIC_WHATSAPP_NUMBER and appears only once it is set. Personal
 * numbers must never be shown on the public site.
 */

/** The message a visitor's chat opens with. General enquiries only — no health details. */
export const WHATSAPP_GREETING = "Hello ThriveSphere Wellbeing, I have a general enquiry.";

/**
 * The wa.me link for a number written any common UK way, or null if there is
 * no usable number.
 *
 * wa.me wants the full international number as digits only: "07700 900123",
 * "+44 7700 900123" and "0044 7700 900123" all become 447700900123.
 */
export function whatsappHref(raw: string | undefined, text = WHATSAPP_GREETING): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `44${digits.slice(1)}`;
  if (!/^\d{10,15}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
