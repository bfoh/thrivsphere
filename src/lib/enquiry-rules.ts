/**
 * Enquiries and callback requests: what the forms accept and how the queue is
 * labelled.
 *
 * Pure, so the rules the IT handover sets (§16.2 fields, §16.4 statuses and
 * references, §19 Route B callback requests) are asserted in tests rather than
 * trusted to the form.
 */

/** §16.2's categories, in the order the form lists them. */
export const CONTACT_CATEGORIES = [
  { value: "individual", label: "Individual wellbeing services" },
  { value: "corporate", label: "Corporate or organisational services" },
  { value: "general", label: "General question" },
  { value: "existing_client", label: "Existing client administrative query" },
  { value: "other", label: "Other" },
] as const;

export type EnquiryCategory = (typeof CONTACT_CATEGORIES)[number]["value"] | "callback";

export function categoryLabel(category: string): string {
  if (category === "callback") return "Callback request";
  return CONTACT_CATEGORIES.find((c) => c.value === category)?.label ?? "Other";
}

/** The statuses staff move an enquiry through (§16.4). */
export const QUEUE_STATUSES = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "awaiting_client", label: "Awaiting client information" },
  { value: "responded", label: "Responded" },
  { value: "closed", label: "Closed" },
] as const;

export type QueueStatus = (typeof QUEUE_STATUSES)[number]["value"];

/** Older statuses still allowed by the database, shown if a row has one. */
const LEGACY_STATUS_LABELS: Record<string, string> = { converted: "Booked", signposted: "Signposted" };

export function statusLabel(status: string): string {
  return QUEUE_STATUSES.find((s) => s.value === status)?.label ?? LEGACY_STATUS_LABELS[status] ?? status;
}

export function isQueueStatus(v: string): v is QueueStatus {
  return QUEUE_STATUSES.some((s) => s.value === v);
}

/** Still waiting on ThriveSphere: what the queue shows first. */
export const OPEN_STATUSES = ["new", "in_progress", "awaiting_client"] as const;

export const CONTACT_METHODS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone call" },
  { value: "either", label: "Either" },
] as const;

export function contactMethodLabel(v: string | null | undefined): string | null {
  if (!v) return null;
  return CONTACT_METHODS.find((m) => m.value === v)?.label ?? null;
}

/**
 * References look like TS-7K2Q9M. The alphabet leaves out 0/O, 1/I/L and U,
 * so a reference read out over the phone cannot be misheard as another.
 */
const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const REF_LENGTH = 6;

/** Build a reference from random bytes (crypto.randomBytes in the action). */
export function makeReference(bytes: Uint8Array): string {
  if (bytes.length < REF_LENGTH) throw new Error("not enough random bytes");
  let out = "";
  for (let i = 0; i < REF_LENGTH; i++) out += REF_ALPHABET[bytes[i] % REF_ALPHABET.length];
  return `TS-${out}`;
}

export function isReference(v: string): boolean {
  return new RegExp(`^TS-[${REF_ALPHABET}]{${REF_LENGTH}}$`).test(v);
}

export type EnquiryForm = "contact" | "callback";

export type ParsedEnquiry = {
  category: EnquiryCategory;
  name: string;
  email: string;
  country: string;
  phone: string | null;
  preferredContact: string | null;
  subject: string | null;
  message: string | null;
  preferredTimes: string | null;
  confirmedAdult: boolean;
};

export type EnquiryParse =
  | { ok: true; value: ParsedEnquiry }
  | { ok: false; fieldErrors: Record<string, string> };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Check a submission.
 *
 * The contact form follows §16.2: category, name, email, country, subject and
 * message are required, phone and contact method optional. A callback request
 * (§19 Route B, §13.1) asks only what is needed to arrange the consultation:
 * no subject, no message, never a health history. Both need the privacy
 * acknowledgement, and a callback request also confirms the person is 18+.
 */
export function parseEnquiry(form: EnquiryForm, input: (name: string) => string, ticked: (name: string) => boolean): EnquiryParse {
  const fieldErrors: Record<string, string> = {};

  const name = input("name");
  const email = input("email");
  const country = input("country");
  const phone = input("phone");
  const preferredContact = input("preferredContact");
  const category = form === "callback" ? "callback" : input("category");
  const subject = input("subject");
  const message = input("message");
  const preferredTimes = input("preferredTimes");

  if (form === "contact" && !CONTACT_CATEGORIES.some((c) => c.value === category)) {
    fieldErrors.category = "Please choose what your enquiry is about.";
  }
  if (!name || name.length > 100) fieldErrors.name = "Please tell us your name.";
  if (!EMAIL.test(email) || email.length > 200) fieldErrors.email = "Please enter an email address we can reply to.";
  if (!country || country.length > 80) fieldErrors.country = "Please tell us which country you are in.";
  if (phone.length > 40) fieldErrors.phone = "Please enter a valid phone number.";
  if (preferredContact && !CONTACT_METHODS.some((m) => m.value === preferredContact)) {
    fieldErrors.preferredContact = "Please choose from the list.";
  }
  if (form === "contact") {
    if (!subject || subject.length > 150) fieldErrors.subject = "Please add a short subject.";
    if (!message) fieldErrors.message = "Please write a brief message.";
    else if (message.length > 3000) fieldErrors.message = "Please keep this under 3,000 characters.";
  } else {
    if (preferredTimes.length > 200) fieldErrors.preferredTimes = "Please keep this short.";
    if (message.length > 500) fieldErrors.message = "Please keep this under 500 characters.";
    if (!ticked("confirmAdult")) fieldErrors.confirmAdult = "We can only work with adults aged 18 or over.";
  }
  if (!ticked("privacy")) fieldErrors.privacy = "Please confirm you have read the privacy information.";

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  return {
    ok: true,
    value: {
      category: category as EnquiryCategory,
      name,
      email: email.toLowerCase(),
      country,
      phone: phone || null,
      preferredContact: preferredContact || null,
      subject: form === "contact" ? subject : null,
      message: message || null,
      preferredTimes: form === "callback" ? preferredTimes || null : null,
      confirmedAdult: form === "callback" && ticked("confirmAdult"),
    },
  };
}
