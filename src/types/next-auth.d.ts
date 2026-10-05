/**
 * src/types/next-auth.d.ts — Module augmentation for NextAuth session types
 *
 * Problem:
 *   NextAuth's built-in Session["user"] type only contains { name?, email?, image? }.
 *   It deliberately omits `id` because the session cookie is shared with the browser,
 *   and NextAuth doesn't want to make assumptions about what's safe to expose.
 *
 * Solution:
 *   We extend the Session interface here to add `id: string`.
 *   This declaration is automatically picked up by TypeScript globally — no import needed.
 *   It corresponds to what we set in the `session` callback inside auth.ts.
 *
 * Result:
 *   const session = await auth()
 *   session.user.id  ← TypeScript is happy, no "Property 'id' does not exist" error
 */

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** The user's Prisma `id` (cuid). Added via the session() callback in auth.ts. */
      id: string;
    } & DefaultSession["user"]; // keeps name, email, image from the default type
  }
}
