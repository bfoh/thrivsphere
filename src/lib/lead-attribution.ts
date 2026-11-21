import "server-only";
import { getDb } from "@/db";
import { leadAttributions } from "@/db/schema";
import { parseAttribution } from "./attribution";

/**
 * Keep how an enquiry or booking found us, if the form said. Never fails the
 * enquiry or booking it belongs to: a lost answer is logged and skipped.
 */
export async function recordAttribution(
  subject: { enquiryId: string } | { orderId: string },
  formData: FormData,
  host: string | null
): Promise<void> {
  const a = parseAttribution((n) => {
    const v = formData.get(n);
    return typeof v === "string" ? v.slice(0, 500) : "";
  }, host);
  if (!a) return;
  try {
    await getDb().insert(leadAttributions).values({ ...subject, ...a });
  } catch (err) {
    console.error("[attribution] not saved", err);
  }
}
