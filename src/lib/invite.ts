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
 *     email:       string   ← the address the invite was sent to (lowercased)
 *     iat:         number   ← issued-at (set by jose automatically)
 *     exp:         number   ← expiry  (set by jose automatically, 48h from now)
 *   }
 *
 * The accept page only creates a membership when the signed-in user's email
 * matches `email`. A forwarded link cannot be used by someone else.
 * Tokens issued before email was required have no `email` and still work.
 *
 * Security:
 *   - Signed with AUTH_SECRET using HMAC-SHA256 (HS256) — same key NextAuth uses.
 *   - jose verifies both the signature AND the exp claim in one call.
 *   - If AUTH_SECRET is ever rotated, all outstanding invite links instantly break.
 *     That's intentional — it's a feature, not a bug.
 */

import { SignJWT, jwtVerify } from "jose";
import { Role } from "@prisma/client";
import { z } from "zod";

// ─── Types ───────────────────────────────────────────────────────────────────

export type InvitePayload = {
  workspaceId: string;
  slug: string;
  role: Role;
  /** Lowercased. Absent only on tokens created before invites required an email. */
  email?: string;
};

const InviteClaimsSchema = z.object({
  workspaceId: z.string().min(1),
  slug: z.string().min(1),
  role: z.nativeEnum(Role),
  email: z.string().email().optional(),
});

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
 *   const token = await signInviteToken({ workspaceId, slug, role: "MEMBER", email })
 *   const url   = `${process.env.AUTH_URL}/invite/accept?token=${token}`
 */
export async function signInviteToken(
  payload: InvitePayload & { email: string }
): Promise<string> {
  return new SignJWT({
    workspaceId: payload.workspaceId,
    slug: payload.slug,
    role: payload.role,
    email: payload.email.trim().toLowerCase(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("48h") // invite links are valid for 48 hours
    .sign(getSecret());
}

/**
 * True when this token may be accepted by the signed-in user.
 * A missing invite email is a legacy token and is allowed.
 * Otherwise the two addresses must match, ignoring case.
 */
export function inviteEmailMatches(
  inviteEmail: string | undefined,
  sessionEmail: string | null | undefined
): boolean {
  if (!inviteEmail) return true;
  if (!sessionEmail) return false;
  return inviteEmail.toLowerCase() === sessionEmail.trim().toLowerCase();
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
  const parsed = InviteClaimsSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Invite token is missing required claims.");
  }
  return parsed.data;
}
