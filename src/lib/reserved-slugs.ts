/**
 * First URL segments that belong to the app, not to a workspace.
 *
 * A workspace lives at /<slug>, so a workspace named "demo" would collide
 * with the /demo route (and one named "api" would be unreachable).
 * proxy.ts uses this list to decide what is NOT a workspace, and
 * POST /api/workspaces uses it to refuse those slugs at creation time.
 *
 * Add any new top-level route here.
 *
 * Pure constants only: proxy.ts runs on the Edge runtime.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "api",
  "sign-in",
  "sign-up",
  "invite",
  "demo",
  "_next",
  "favicon.ico",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}
