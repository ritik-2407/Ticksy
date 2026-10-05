/**
 * src/lib/invite.ts — JWT-based invite token helpers
 *
 * WHY JWTs for invites (instead of storing tokens in the DB)?
 *   A DB-stored token requires a schema migration (new Invite table),
 *   a cleanup job to purge expired rows, and an extra query on every accept.
 *
 *   A signed JWT is self-contained — the token itself carries the payload
 *   AND proves it hasn't been tampered with (HMAC-SHA256 signature).
 *   The server just verifies the signature + checks expiry. No DB read needed.
 *
 *   Trade-off: you can't revoke an individual token before it expires.
 *   For a 48-hour invite link that's acceptable. If you need revocation,
 *   add an Invite model later and store a `usedAt` timestamp.
 *
 * Token payload:
 *   {
 *     workspaceId: string   ← the Prisma workspace id (not the slug)
 *     slug:        string   ← used in the redirect after acceptance
 *     role:        "ADMIN" | "MEMBER"
 *     iat:         number   ← issued-at (set by jose automatically)
 *     exp:         number   ← expiry  (set by jose automatically, 48h from now)
 *   }
 *
 * Security:
 *   - Signed with AUTH_SECRET using HMAC-SHA256 (HS256) — same key NextAuth uses.
 *   - jose verifies both the signature AND the exp claim in one call.
 *   - If AUTH_SECRET is ever rotated, all outstanding invite links instantly break.
 *     That's intentional — it's a feature, not a bug.
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { Role } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type InvitePayload = {
  workspaceId: string;
  slug: string;
  role: Role;
};

// ─── Key ─────────────────────────────────────────────────────────────────────

/**
 * jose needs the secret as a Uint8Array.
 * We use AUTH_SECRET (NextAuth v5 canonical) with NEXTAUTH_SECRET as fallback.
 */
function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Add it to your .env file to use invite tokens."
    );
  }
  return new TextEncoder().encode(secret);
}

// ─── Sign ────────────────────────────────────────────────────────────────────

/**
 * signInviteToken(payload)
 *
 * Creates a signed JWT invite token that expires in 48 hours.
 * Returns the compact JWT string — embed it in the invite URL.
 *
 * @example
 *   const token = await signInviteToken({ workspaceId, slug, role: "MEMBER" })
 *   const url   = `${process.env.AUTH_URL}/invite/accept?token=${token}`
 */
export async function signInviteToken(payload: InvitePayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("48h") // invite links are valid for 48 hours
    .sign(getSecret());
}

// ─── Verify ──────────────────────────────────────────────────────────────────

/**
 * verifyInviteToken(token)
 *
 * Verifies the JWT signature and expiry, then returns the typed payload.
 * Throws if the token is invalid, expired, or tampered with.
 *
 * @example
 *   const payload = await verifyInviteToken(token)
 *   // payload.workspaceId, payload.slug, payload.role are all typed
 */
export async function verifyInviteToken(token: string): Promise<InvitePayload> {
  const { payload } = await jwtVerify(token, getSecret());
  // Type-cast: we know we put these fields in at sign time.
  // A stricter implementation would validate each field with Zod after verify.
  return payload as JWTPayload & InvitePayload;
}
