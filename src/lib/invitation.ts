/**
 * Clerk's staff invitation link.
 *
 * Accepting an invitation in the email opens our page with a one-time ticket
 * in the query string. Only Clerk's sign-up form can use it, so a page that
 * receives one passes these two parameters on and nothing else.
 */
const KEYS = ["__clerk_ticket", "__clerk_status"] as const;

type Query = Record<string, string | string[] | undefined>;

/** The invitation's query string, or null when the page was not opened from one. */
export function invitationQuery(query: Query): string | null {
  const ticket = query.__clerk_ticket;
  if (typeof ticket !== "string" || !ticket) return null;
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const value = query[key];
    if (typeof value === "string" && value) params.set(key, value);
  }
  return params.toString();
}

/**
 * Whether a signed-in account was created moments ago: the person who has
 * just accepted the invitation, rather than someone else already signed in on
 * the same device.
 */
export function acceptedJustNow(accountCreatedAt: number, now: number = Date.now()): boolean {
  return now - accountCreatedAt < 15 * 60 * 1000;
}

/** Whether the invitation is for someone who still has to create their account. */
export function isNewAccountInvitation(query: Query): boolean {
  return invitationQuery(query) !== null && query.__clerk_status === "sign_up";
}
