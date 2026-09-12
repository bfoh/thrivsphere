import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Route protection.
 *
 * Next 16 renamed the `middleware` file convention to `proxy`; this is the
 * same mechanism under its current name.
 *
 * Note this is a first line of defence, not the only one. Every server action
 * and route handler that touches a client record still goes through the guard
 * in `src/lib/guard.ts`, which re-checks the actor and writes the audit row.
 * Path-based matching alone is too easy to get subtly wrong for something
 * guarding confidential records.
 */
const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/portal(.*)",
  "/api/admin(.*)",
  "/api/portal(.*)",
]);

export const proxy = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files unless they appear in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
