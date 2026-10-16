/**
 * src/proxy.ts — Next.js Edge Proxy (replaces the deprecated middleware.ts)
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
 *    Proxy runs in the Edge runtime. auth() pulls in the Prisma
 *    adapter and `pg`, and that bundle crashes on Edge
 *    ("Native module not found: node:util/types"). The database session
 *    check belongs in Node, inside each page and route via auth() +
 *    requireMembership(). Proxy only checks that the session cookie
 *    exists. A stale cookie gets past this file; the page then sees
 *    auth() === null and redirects to /sign-in.
 *
 * WHAT proxy does NOT do:
 *    - It does NOT hit the database to verify the slug exists.
 *      requireMembership() does that in the page or route handler.
 *
 * Request lifecycle:
 *    Browser → proxy.ts → (cookie?) → (slug header) → page / route
 *                              ↓ (no cookie)
 *                        redirect → /sign-in?callbackUrl=...
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isReservedSlug } from "@/lib/reserved-slugs";

// ─── Route classification ────────────────────────────────────────────────────

/**
 * Returns true if the pathname looks like a workspace-scoped URL.
 * Examples:
 *   /acme-corp            → true  (workspace board)
 *   /sign-in              → false (public auth page)
 *   /api/workspaces       → false (API route)
 *   /invite/accept        → false (invite page)
 */
function isWorkspaceRoute(pathname: string): boolean {
  // Top-level app routes (api, demo, …) are not workspaces. The list lives in
  // lib/reserved-slugs.ts, which POST /api/workspaces also uses so nobody can
  // create a workspace whose URL is one of them.
  const firstSegment = pathname.split("/")[1];
  return !!firstSegment && !isReservedSlug(firstSegment);
}

/**
 * Returns true for routes that are always public — no session needed.
 */
function isPublicRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth") ||
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname === "/" ||
    // The public demo. Seeded, in-browser data; no account needed.
    pathname === "/demo" ||
    pathname.startsWith("/demo/")
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

// ─── Proxy function ──────────────────────────────────────────────────────────

export function proxy(req: NextRequest) {
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
 * Tell Next.js which paths to run the proxy on.
 * We exclude:
 *   - _next/static  → bundled JS/CSS
 *   - _next/image   → image optimization responses
 *   - favicon.ico   → browser auto-request
 *   - image files   → /public assets and metadata icons (logo.png, apple-icon.png…).
 *                     They must load for signed-out visitors on the landing page;
 *                     otherwise the session guard redirects them to /sign-in.
 *
 * Everything else (pages, API routes) goes through the proxy.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
