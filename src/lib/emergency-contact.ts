/**
 * Emergency Contact / Next of Kin (IT handover §15.2–15.4).
 *
 * Asked of every client before their first booking. They either give a
 * contact or say they are unable or would prefer not to; that answer is
 * recorded and never blocks them (owner's decision, 21 November 2026). The
 * contact is never messaged automatically, and only the Safeguarding Lead,
 * the Deputy and the client's own practitioners can see it.
 *
 * Pure and tested.
 */

export const HEADING = "Emergency Contact / Next of Kin";

/** §15.3, word for word. */
export const EXPLANATION =
  "We ask for an emergency contact so we have someone we may consider contacting if there is a serious concern for your immediate safety and it is appropriate and lawful to do so. Providing a contact does not mean we will share your session notes or routine wellbeing information with them. We may need to contact emergency or safeguarding services directly when necessary. Please keep these details up to date.";

/** §15.2: who the person is, and is not. */
export const NOT_ENTITLED =
  "The person you name is not automatically entitled to information about you, and is not involved in your sessions. An emergency contact may be different from your legal next of kin.";

/** §15.2: permission and limitations. */
export const LIMITS =
  "We would normally only contact them if there is a serious concern for your safety, or where it is lawful and necessary. We will not give them routine updates about your sessions.";

/** §15.2, word for word. */
export const INFORMED_ACK =
  "I have informed this person, where practicable, that I have provided their details as an emergency contact.";

export const ANSWERS = [
  { key: "provided", label: "I'll add an emergency contact" },
  { key: "unable", label: "I'm unable to provide an emergency contact" },
  { key: "prefer_not", label: "I'd prefer not to provide an emergency contact" },
] as const;

export const METHODS = [
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "other", label: "Other" },
] as const;

/** Suggestions only: relationship is free text (§15.2). */
export const RELATIONSHIPS = ["Partner", "Spouse", "Parent", "Son or daughter", "Brother or sister", "Other family member", "Friend", "Neighbour", "Carer"];

export type EmergencyAnswer = (typeof ANSWERS)[number]["key"];
export type EmergencyMethod = (typeof METHODS)[number]["key"];

export type EmergencyContact = {
  status: EmergencyAnswer;
  name: string | null;
  relationship: string | null;
  phone: string | null;
  alt: string | null;
  country: string | null;
  timeZone: string | null;
  method: EmergencyMethod | null;
  methodOther: string | null;
  informed: boolean | null;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** A phone number written with its international dialling code, e.g. +44 7700 900123. */
export function isInternationalPhone(v: string): boolean {
  const compact = v.replace(/[\s().-]/g, "");
  return /^(\+|00)[1-9]\d{6,14}$/.test(compact);
}

/** A time zone the browser and server both know, e.g. Europe/London. */
export function isTimeZone(v: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: v });
    return true;
  } catch {
    return false;
  }
}

type Reader = { get: (name: string) => string };

/** Read and check the client's answer. Details are kept only when a contact is given. */
export function parseEmergencyContact(r: Reader): { ok: true; value: EmergencyContact } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const text = (name: string, max: number) => {
    const v = r.get(name).trim();
    if (v.length > max) errors[name] = "That's too long.";
    return v || null;
  };

  const status = r.get("answer");
  if (!ANSWERS.some((a) => a.key === status)) {
    return { ok: false, errors: { answer: "Please choose one of the options." } };
  }
  if (status !== "provided") {
    return {
      ok: true,
      value: { status: status as EmergencyAnswer, name: null, relationship: null, phone: null, alt: null, country: null, timeZone: null, method: null, methodOther: null, informed: null },
    };
  }

  const name = text("name", 120);
  if (!name) errors.name = "Enter their full name.";
  const relationship = text("relationship", 80);
  if (!relationship) errors.relationship = "Say how they are related to you, or how you know them.";
  const phone = text("phone", 40);
  if (!phone) errors.phone = "Enter their phone number.";
  else if (!isInternationalPhone(phone)) errors.phone = "Include the international dialling code, for example +44 7700 900123.";
  const alt = text("alt", 160);
  if (alt && !EMAIL.test(alt) && !isInternationalPhone(alt)) errors.alt = "Enter an email address, or a phone number with its international dialling code.";
  const country = text("country", 80);
  if (!country) errors.country = "Enter the country they live in.";
  const timeZone = text("timeZone", 64);
  if (timeZone && !isTimeZone(timeZone)) errors.timeZone = "Choose a time zone from the list, or leave it blank.";
  const method = r.get("method");
  if (!METHODS.some((m) => m.key === method)) errors.method = "Choose how we should contact them.";
  const methodOther = method === "other" ? text("methodOther", 120) : null;
  if (method === "other" && !methodOther) errors.methodOther = "Say how we should contact them.";
  if (method === "email" && !(alt && EMAIL.test(alt))) errors.alt = "Add their email address here, as you've chosen email.";
  const informed = r.get("informed") === "on";
  if (!informed) errors.informed = "Please confirm this, or choose one of the other options above.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { status: "provided", name, relationship, phone, alt, country, timeZone, method: method as EmergencyMethod, methodOther, informed },
  };
}

/**
 * Who may see a client's emergency contact (§15.4; owner's decision,
 * 21 November 2026): the founder as Safeguarding Lead, the Deputy
 * Safeguarding Lead, and practitioners the client has an appointment with.
 * Other administrators don't, even though they can open the record.
 */
export function canSeeEmergencyContact(o: { role: string; safeguardingDeputy: boolean; isTheirPractitioner: boolean }): boolean {
  return o.role === "founder" || o.safeguardingDeputy || o.isTheirPractitioner;
}

export const answerLabel = (k: string | null) =>
  k === "provided" ? "Contact given" : k === "unable" ? "Unable to provide one" : k === "prefer_not" ? "Preferred not to provide one" : "Not asked yet";
export const methodLabel = (k: string | null, other?: string | null) =>
  k === "other" ? `Other${other ? `: ${other}` : ""}` : (METHODS.find((m) => m.key === k)?.label ?? null);

/**
 * The contact as staff see it, one line per detail, with the country and
 * time zone so nobody assumes they are in the UK (§15.4).
 */
export function contactLines(ec: {
  status: string | null;
  name: string | null;
  relationship: string | null;
  phone: string | null;
  alt: string | null;
  country: string | null;
  timeZone: string | null;
  method: string | null;
  methodOther: string | null;
}): string[] {
  if (ec.status !== "provided") return [answerLabel(ec.status)];
  return [
    [ec.name, ec.relationship && `(${ec.relationship})`].filter(Boolean).join(" "),
    ec.phone,
    ec.alt,
    [ec.country, ec.timeZone].filter(Boolean).join(" · "),
    ec.method && `Prefers: ${methodLabel(ec.method, ec.methodOther)}`,
  ].filter((l): l is string => !!l);
}
