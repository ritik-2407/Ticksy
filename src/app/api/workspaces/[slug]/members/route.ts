/**
 * GET /api/workspaces/[slug]/members
 *
 * Returns all members of a workspace with their user profile and role.
 * Any member (ADMIN or MEMBER) can call this — you need to be IN the workspace to see it.
 *
 * Flow:
 *   1. auth()               → who is calling?
 *   2. requireMembership()  → are they in this workspace? (throws 401/403 if not)
 *   3. prisma query         → fetch all members, scoped by workspaceId
 *
 * WHY use workspaceId from the guard result instead of re-querying by slug?
 *   requireMembership() already did the slug → workspaceId lookup. Reusing
 *   its return value avoids a second JOIN and keeps the query simple.
 *
 * Response shape:
 *   {
 *     members: [
 *       {
 *         id: "membership-cuid",
 *         role: "ADMIN" | "MEMBER",
 *         createdAt: "...",
 *         user: { id, name, email, image }
 *       }
 *     ]
 *   }
 *
 * Responses:
 *   200  { members }
 *   401  { error }   — not signed in
 *   403  { error }   — not a member of this workspace
 *   500  { error }   — unexpected error
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { requireMembership } from "@/lib/guard";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const session = await auth();

  // ── Guard ────────────────────────────────────────────────────────────────
  // Throws 401 if no session, 403 if not a member.
  // Returns { userId, workspaceId, role } on success.
  let workspaceId: string;
  try {
    const { slug } = await params;
    ({ workspaceId } = await requireMembership(slug, session?.user?.id));
  } catch (res) {
    // The guard throws a Response — return it directly to Next.js
    return res as Response;
  }

  // ── Query ────────────────────────────────────────────────────────────────
  try {
    const members = await prisma.membership.findMany({
      where: { workspaceId },
      orderBy: [
        // ADMINs first, then by join date
        { role: "asc" },
        { createdAt: "asc" },
      ],
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return Response.json({ members });
  } catch (err) {
    console.error("[GET /api/workspaces/[slug]/members]", err);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
