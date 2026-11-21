import "server-only";

import { requireCapability, type GuardOptions } from "@/lib/guard";
import { ForbiddenError, UnauthenticatedError, type Actor, type Capability } from "@/lib/authz";

/** Same-site only: a page on another site can't make a signed-in browser call this. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** requireCapability for route handlers: an Actor, or the JSON error to send back. */
export async function guardRoute(capability: Capability, options: GuardOptions): Promise<Actor | Response> {
  try {
    return await requireCapability(capability, options);
  } catch (err) {
    if (err instanceof UnauthenticatedError) return Response.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
    if (err instanceof ForbiddenError) return Response.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
