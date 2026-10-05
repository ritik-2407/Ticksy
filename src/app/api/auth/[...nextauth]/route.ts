/**
 * src/app/api/auth/[...nextauth]/route.ts
 *
 * This is the NextAuth catch-all route handler.
 * It handles every auth-related HTTP request:
 *   GET  /api/auth/session        → returns the current session JSON
 *   GET  /api/auth/providers      → returns configured providers list
 *   GET  /api/auth/csrf           → CSRF token for forms
 *   GET  /api/auth/callback/google → Google OAuth callback
 *   POST /api/auth/signout        → kills the session
 *   ...and more, all handled by NextAuth internally.
 *
 * WHY is this file so thin?
 *   All the logic lives in src/auth.ts. This file's only job is to
 *   wire NextAuth's handlers into the Next.js App Router's GET/POST exports.
 *   Keeping it thin means we only have ONE place to change auth config.
 */

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
