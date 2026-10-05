/**
 * DELETE /api/workspaces/[slug]/members/[membershipId]
 *
 * Removes one person from this workspace. ADMIN only.
 *
 * The membership id is the row id, not the user id. That is what
 * GET /api/workspaces/[slug]/members returns as `id`.
 *
 * A workspace always keeps one admin. Removing the last admin is rejected,
 * including when that admin is trying to leave.
 *
 * Tickets they created stay, and so do comments they wrote. Tickets
 * assigned to them in this workspace become unassigned, because an
 * assignee has to be a member.
 *
 * Responses:
 *   200  { ok: true }
 *   400  { error }   — this would remove the last admin
 *   401  { error }
 *   403  { error }   — not an admin
 *   404  { error }   — no such member in this workspace
 *   500  { error }
 */

import { auth } from "@/auth";
import { requireAdmin } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; membershipId: string }> }
) {
  const session = await auth();

  let workspaceId: string;
  let membershipId: string;
  try {
    const resolved = await params;
    membershipId = resolved.membershipId;
    ({ workspaceId } = await requireAdmin(resolved.slug, session?.user?.id));
  } catch (res) {
    return res as Response;
  }

  if (!z.string().cuid().safeParse(membershipId).success) {
    return jsonError("Member not found.", 404);
  }

  try {
    const removed = await prisma.$transaction(async (tx) => {
      const target = await tx.membership.findFirst({
        where: { id: membershipId, workspaceId },
        select: { id: true, role: true, userId: true },
      });
      if (!target) return false;

      if (target.role === Role.ADMIN) {
        const admins = await tx.membership.count({
          where: { workspaceId, role: Role.ADMIN },
        });
        if (admins <= 1) throw jsonError("A workspace needs at least one admin.", 400);
      }

      await tx.ticket.updateMany({
        where: { workspaceId, assigneeId: target.userId },
        data: { assigneeId: null },
      });

      await tx.membership.delete({ where: { id: target.id } });
      return true;
    });

    if (!removed) return jsonError("Member not found.", 404);
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return jsonError("Member not found.", 404);
    }
    console.error("[DELETE /api/workspaces/[slug]/members/[membershipId]]", err);
    return jsonError("Internal server error.", 500);
  }
}
