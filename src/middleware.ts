/**
 * src/middleware.ts — Next.js Edge Middleware
 *
 * Runs on EVERY request before it reaches a route handler or page.
 * Two responsibilities:
 *
 * ① SESSION GUARD
 *    If a user hits any protected route without a session cookie → redirect /sign-in.
 *
 * ② WORKSPACE SLUG RESOLVER
 *    URLs look like: /acme-corp
 *    The first segment is the workspace slug. We forward it as the
 *    `x-workspace-slug` request header so later code can read
 *      headers().get("x-workspace-slug")
 *    without parsing the URL again.
 *
 * WHY this file does NOT call auth() or Prisma:
 *    Middleware runs in the Edge runtime. auth() pulls in the Prisma
 *    adapter and `pg`, and that bundle crashes on Edge
 *    ("Native module not found: node:util/types"). The database session
 *    check belongs in Node, inside each page and route via auth() +
 *    requireMembership(). Middleware only checks that the session cookie
 *    exists. A stale cookie gets past this file; the page then sees
 *    auth() === null and redirects to /sign-in.
 *
 * WHAT middleware does NOT do:
 *    - It does NOT hit the database to verify the slug exists.
 *      requireMembership() does that in the page or route handler.
 *
 * Request lifecycle:
 *    Browser → middleware.ts → (cookie?) → (slug header) → page / route
 *                                  ↓ (no cookie)
 *                            redirect → /sign-in?callbackUrl=...
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─── Route classification ────────────────────────────────────────────────────

/**
 * Segments that are NOT workspace slugs — they're top-level app routes.
 * Add any future top-level routes here (e.g. "pricing", "blog").
 */
const NON_SLUG_SEGMENTS = new Set([
  "api",
  "sign-in",
  "sign-up",
  "invite",
  "_next",
  "favicon.ico",
]);

/**
 * Returns true if the pathname looks like a workspace-scoped URL.
 * Examples:
 *   /acme-corp            → true  (workspace board)
 *   /sign-in              → false (public auth page)
 *   /api/workspaces       → false (API route)
 *   /invite/accept        → false (invite page)
 */
function isWorkspaceRoute(pathname: string): boolean {
  const firstSegment = pathname.split("/")[1];
  return !!firstSegment && !NON_SLUG_SEGMENTS.has(firstSegment);
}

/**
 * Returns true for routes that are always public — no session needed.
 */
function isPublicRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth") ||
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname === "/"
  );
}

/**
 * Auth.js stores a database session as an opaque cookie, not a JWT.
 * Dev (http) uses authjs.session-token. Production (https) prefixes __Secure-.
 * A long value can be split into .0, .1, … chunks.
 */
function hasSessionCookie(req: NextRequest): boolean {
  return req.cookies.getAll().some((cookie) => {
    const name = cookie.name;
    return (
      name === "authjs.session-token" ||
      name.startsWith("authjs.session-token.") ||
      name === "__Secure-authjs.session-token" ||
      name.startsWith("__Secure-authjs.session-token.")
    );
  });
}

// ─── Middleware function ─────────────────────────────────────────────────────

export function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const { pathname } = nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  if (!hasSessionCookie(req)) {
    const signInUrl = new URL("/sign-in", nextUrl.origin);
    // Keep the query string. An invite link is /invite/accept?token=...
    // and the token is the only thing that page can verify.
    signInUrl.searchParams.set("callbackUrl", `${pathname}${nextUrl.search}`);
    return NextResponse.redirect(signInUrl);
  }

  if (isWorkspaceRoute(pathname)) {
    const slug = pathname.split("/")[1];
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-workspace-slug", slug);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
}

// ─── Matcher ─────────────────────────────────────────────────────────────────
/**
 * Tell Next.js which paths to run middleware on.
 * We exclude:
 *   - _next/static  → bundled JS/CSS
 *   - _next/image   → image optimization responses
 *   - favicon.ico   → browser auto-request
 *
 * Everything else (pages, API routes) goes through the middleware.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
