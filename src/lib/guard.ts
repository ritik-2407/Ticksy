/**
 * src/lib/guard.ts — Route-level authorization guards
 *
 * PATTERN:
 *   Every API route handler (and server action) that touches workspace data
 *   calls one of these functions as its FIRST line. If the check fails,
 *   the function throws a Response — Next.js catches it and sends the HTTP error.
 *   If it passes, it returns the membership row so the caller has the user's
 *   role without a second DB round-trip.
 *
 * FOUR guards:
 *
 *   requireMembership(slug, userId)
 *     → "Is this user logged-in AND a member of this workspace?"
 *     → Used on slug routes: GET /tickets, POST /tickets …
 *
 *   requireAdmin(slug, userId)
 *     → "Is this user an ADMIN of this workspace?"
 *     → Used only on destructive/privileged slug routes: DELETE member, create a label, invite …
 *     → Internally calls requireMembership first — one function call is enough.
 *
 *   requireTicket(ticketId, userId)
 *     → "Does this ticket exist AND is the user a member of its workspace?"
 *     → Used on /api/tickets/[id], where the URL has no slug.
 *     → A missing ticket and a ticket in another workspace both return 404.
 *       403 would tell a stranger "that id is real, you just can't see it."
 *
 *   requireTicketAdmin(ticketId, userId)
 *     → requireTicket, then ADMIN. Used for DELETE /api/tickets/[id].
 *     → A non-member still gets 404. A member who is not an admin gets 403.
 *
 * WHY throw a Response instead of returning null?
 *   If we returned null, every caller would need to write:
 *     const m = await requireMembership(slug, userId)
 *     if (!m) return Response.json({ error: "..." }, { status: 403 })
 *   That's error-prone boilerplate — easy to forget. Throwing means the
 *   guard is truly a gate: either it passes or the request dies right there.
 *
 * WHY accept `userId` as a parameter instead of calling `auth()` inside?
 *   Separation of concerns. The caller (the route handler) already resolved
 *   the session. Passing userId in keeps the guard pure and testable.
 *
 * USAGE IN A ROUTE HANDLER:
 *   import { requireMembership, requireAdmin } from "@/lib/guard"
 *
 *   // Any member can read:
 *   export async function GET(req, { params }) {
 *     const session = await auth()
 *     const { membership } = await requireMembership(params.slug, session?.user?.id)
 *     // ... safe to query Prisma here
 *   }
 *
 *   // Only admins can delete:
 *   export async function DELETE(req, { params }) {
 *     const session = await auth()
 *     await requireAdmin(params.slug, session?.user?.id)
 *     // ... safe to delete here
 *   }
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * What both guards return on success.
 * Callers get the workspace id + the user's role — no extra query needed.
 */
export type GuardResult = {
  userId: string;
  workspaceId: string;
  role: Role;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve the current session and extract userId.
 * Throws 401 if there is no session at all.
 */
async function resolveUser(callerUserId?: string): Promise<string> {
  // If the caller already resolved the session, trust it (avoids double auth() call).
  if (callerUserId) return callerUserId;

  const session = await auth();
  if (!session?.user?.id) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized — you must be signed in." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  return session.user.id;
}

// ─── Guards ──────────────────────────────────────────────────────────────────

/**
 * requireMembership(slug, userId?)
 *
 * Checks:
 *   1. Session exists (401 if not).
 *   2. Workspace with this slug exists (404 if not).
 *   3. User has a Membership row in that workspace (403 if not).
 *
 * Returns: { userId, workspaceId, role }
 *
 * @param slug     - The workspace slug from the URL (e.g. "acme-corp")
 * @param userId   - Optional: pre-resolved userId from the caller's session check.
 *                   If omitted, the guard calls auth() itself.
 */
export async function requireMembership(
  slug: string,
  userId?: string
): Promise<GuardResult> {
  const uid = await resolveUser(userId);

  // Single JOIN query: find the membership row that matches both
  // the workspace slug AND the userId. Prisma translates this to:
  //   SELECT m.* FROM Membership m
  //   JOIN Workspace w ON w.id = m.workspaceId
  //   WHERE w.slug = $1 AND m.userId = $2
  //   LIMIT 1
  const membership = await prisma.membership.findFirst({
    where: {
      userId: uid,
      workspace: { slug },
    },
    select: {
      role: true,
      workspaceId: true,
    },
  });

  if (!membership) {
    // Could be: workspace doesn't exist OR user isn't a member.
    // We return 403 in both cases — we don't want to leak whether
    // a workspace with this slug exists to non-members.
    throw new Response(
      JSON.stringify({
        error: "Forbidden — you are not a member of this workspace.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return {
    userId: uid,
    workspaceId: membership.workspaceId,
    role: membership.role,
  };
}

/**
 * requireAdmin(slug, userId?)
 *
 * Extends requireMembership — additionally enforces that the user's role is ADMIN.
 * Throws 403 if the user is only a MEMBER.
 *
 * Use this on privileged routes:
 *   - DELETE /api/workspaces/[slug]/members/[id]
 *   - PATCH  /api/workspaces/[slug]  (rename workspace)
 *   - DELETE /api/workspaces/[slug]  (delete workspace)
 *   - POST   /api/workspaces/[slug]/invites
 *   - POST   /api/workspaces/[slug]/labels
 *   - PATCH / DELETE /api/workspaces/[slug]/labels/[labelId]
 *
 * @param slug     - The workspace slug from the URL
 * @param userId   - Optional: pre-resolved userId
 */
export async function requireAdmin(
  slug: string,
  userId?: string
): Promise<GuardResult> {
  const result = await requireMembership(slug, userId);

  if (result.role !== Role.ADMIN) {
    throw new Response(
      JSON.stringify({
        error: "Forbidden — only workspace admins can perform this action.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return result;
}

/**
 * requireTicket(ticketId, userId?)
 *
 * For routes addressed by ticket id, not by workspace slug:
 *   GET   /api/tickets/[id]
 *   PATCH /api/tickets/[id]
 *
 * Checks:
 *   1. Session exists (401 if not).
 *   2. A ticket with this id exists AND the user has a membership
 *      in that ticket's workspace.
 *   3. Otherwise 404. We use the same response for "no such row" and
 *      "this row belongs to a workspace you are not in", so a caller
 *      cannot probe ticket ids that belong to other tenants.
 *
 * Returns the same GuardResult as requireMembership, plus ticketId,
 * so the route can scope its write with workspaceId.
 */
export async function requireTicket(
  ticketId: string,
  userId?: string
): Promise<GuardResult & { ticketId: string }> {
  const uid = await resolveUser(userId);

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, workspaceId: true },
  });

  if (!ticket) {
    throw ticketNotFound();
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: { userId: uid, workspaceId: ticket.workspaceId },
    },
    select: { role: true, workspaceId: true },
  });

  if (!membership) {
    throw ticketNotFound();
  }

  return {
    userId: uid,
    workspaceId: membership.workspaceId,
    role: membership.role,
    ticketId: ticket.id,
  };
}

/**
 * requireTicketAdmin(ticketId, userId?)
 *
 * Same lookup as requireTicket, then refuses anyone who is not an ADMIN.
 * Call this on destructive ticket routes (DELETE). Do not re-check
 * `role !== ADMIN` in the handler — that check is easy to drop on the
 * next edit.
 *
 * A stranger and a missing id still get 404 from requireTicket.
 * A member who is not an admin gets 403.
 */
export async function requireTicketAdmin(
  ticketId: string,
  userId?: string
): Promise<GuardResult & { ticketId: string }> {
  const result = await requireTicket(ticketId, userId);

  if (result.role !== Role.ADMIN) {
    throw new Response(
      JSON.stringify({
        error: "Forbidden — only workspace admins can perform this action.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return result;
}

function ticketNotFound(): Response {
  return new Response(JSON.stringify({ error: "Ticket not found." }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}
