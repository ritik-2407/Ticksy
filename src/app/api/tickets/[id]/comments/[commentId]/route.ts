/**
 * PATCH /api/tickets/[id]/comments/[commentId]
 *
 * Rewrites the body of one comment. Only the author can do this.
 * createdAt stays the time the comment was first posted.
 *
 * WHY not any member, and not even an admin?
 *   A comment is what that person said. Letting someone else rewrite it
 *   would put words under their name. Admins can delete the ticket, which
 *   removes the thread, but they cannot edit a sentence they did not write.
 *
 * Request body:
 *   { "body": "Updated wording." }
 *
 * Responses:
 *   200  { comment }
 *   400  { error, issues }
 *   401  { error }
 *   403  { error }   — signed in, but not the author
 *   404  { error }   — missing ticket, missing comment, or wrong workspace
 *   500  { error }
 */

import { auth } from "@/auth";
import { requireTicket } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const UpdateCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty.")
    .max(10_000, "Comment must be at most 10,000 characters."),
});

const commentSelect = {
  id: true,
  body: true,
  createdAt: true,
  author: {
    select: { id: true, name: true, image: true },
  },
} satisfies Prisma.CommentSelect;

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const session = await auth();
  const { id, commentId } = await params;

  if (!z.string().cuid().safeParse(id).success) {
    return jsonError("Ticket not found.", 404);
  }
  if (!z.string().cuid().safeParse(commentId).success) {
    return jsonError("Comment not found.", 404);
  }

  let ticketId: string;
  let workspaceId: string;
  let userId: string;
  try {
    ({ ticketId, workspaceId, userId } = await requireTicket(id, session?.user?.id));
  } catch (res) {
    return res as Response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const parsed = UpdateCommentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const comment = await prisma.$transaction(async (tx) => {
      const existing = await tx.comment.findFirst({
        where: { id: commentId, ticketId, ticket: { workspaceId } },
        select: { id: true, authorId: true },
      });
      if (!existing) throw jsonError("Comment not found.", 404);
      if (existing.authorId !== userId) {
        throw jsonError("You can only edit your own comments.", 403);
      }

      // A comment is activity on the ticket, same as posting one.
      // The board orders each column by updatedAt.
      const touched = await tx.ticket.updateMany({
        where: { id: ticketId, workspaceId },
        data: { updatedAt: new Date() },
      });
      if (touched.count === 0) throw jsonError("Ticket not found.", 404);

      return tx.comment.update({
        where: { id: existing.id },
        data: { body: parsed.data.body },
        select: commentSelect,
      });
    });

    return Response.json({ comment });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return jsonError("Comment not found.", 404);
    }
    console.error("[PATCH /api/tickets/[id]/comments/[commentId]]", err);
    return jsonError("Internal server error.", 500);
  }
}
