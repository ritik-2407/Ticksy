/**
 * src/auth.ts — NextAuth v5 configuration (the single source of truth for auth)
 *
 * WHY one file?
 *   NextAuth v5 exports four things from one place:
 *   - handlers  → fed to the [...nextauth] route (GET + POST)
 *   - auth      → replaces the old getServerSession() — call it anywhere server-side
 *   - signIn    → server action to trigger a sign-in flow
 *   - signOut   → server action to kill the session
 *
 * WHY PrismaAdapter?
 *   We want database sessions (not JWTs) because:
 *   1. We can invalidate a session server-side instantly.
 *   2. The Account + Session + VerificationToken models in the schema already
 *      match exactly what the adapter expects — no extra work.
 *
 * WHY session callback?
 *   The default NextAuth Session type does NOT include user.id — only name,
 *   email, image. Every route handler and server component needs the id to
 *   run Prisma queries. The callback injects it once here so callers never
 *   have to do a separate DB lookup.
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // ── Adapter ──────────────────────────────────────────────────────────────
  // Tells NextAuth to persist users / sessions / accounts in our Postgres DB
  // via the PrismaClient singleton (adapter-pg under the hood).
  adapter: PrismaAdapter(prisma),

  // ── Providers ────────────────────────────────────────────────────────────
  // One provider for now. Add more (GitHub, Email magic-link, etc.) here later.
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  // ── Custom pages ─────────────────────────────────────────────────────────
  // Override the built-in NextAuth UI with our own branded sign-in page.
  pages: {
    signIn: "/sign-in",
  },

  // ── Callbacks ────────────────────────────────────────────────────────────
  callbacks: {
    /**
     * session() runs every time a session is read (server components, API routes).
     * `user` is the full DB row; `session.user` is the safe subset exposed to the client.
     *
     * We inject user.id so callers can write:
     *   const session = await auth()
     *   const userId  = session?.user?.id   ← always available, no extra query
     */
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
