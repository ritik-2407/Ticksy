/**
 * /api/tickets/[id]/comments
 *
 * GET  — the thread, oldest first. Any member of the ticket's workspace.
 * POST — append one comment. Same rule.
 *
 * Changing a comment is PATCH /api/tickets/[id]/comments/[commentId], and
 * only the author can do it. This route does not rewrite or remove one.
 *
 * WHY authorId is not in the body:
 *   The signed-in user is the author. A body field would let someone
 *   write a comment under a teammate's name.
 *
 * WHY ticketId is not in the body:
 *   requireTicket() already resolved this id and proved the caller is a
 *   member of its workspace. A body field would let them attach the
 *   comment to a ticket in another workspace.
 *
 * Request body (POST):
 *   { "body": "Looks good. Ship it." }
 *
 * Responses:
 *   200  { comments }         — GET
 *   201  { comment }          — POST
 *   400  { error, issues }
 *   401  { error }
 *   404  { error }            — missing ticket, or not in a workspace you belong to
 *   500  { error }
 */

import { auth } from "@/auth";
import { requireTicket } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const CreateCommentSchema = z.object({
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

async function authorize(
  params: Promise<{ id: string }>,
  userId: string | undefined
) {
  const { id } = await params;
  if (!z.string().cuid().safeParse(id).success) {
    throw new Response(JSON.stringify({ error: "Ticket not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return requireTicket(id, userId);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  let ticketId: string;
  let workspaceId: string;
  try {
    ({ ticketId, workspaceId } = await authorize(params, session?.user?.id));
  } catch (res) {
    return res as Response;
  }

  try {
    // ticket.workspaceId is the second lock. requireTicket already checked
    // membership; this query still cannot return comments from another tenant.
    const comments = await prisma.comment.findMany({
      where: { ticketId, ticket: { workspaceId } },
      orderBy: { createdAt: "asc" },
      select: commentSelect,
    });

    return Response.json({ comments });
  } catch (err) {
    console.error("[GET /api/tickets/[id]/comments]", err);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  let ticketId: string;
  let workspaceId: string;
  let userId: string;
  try {
    ({ ticketId, workspaceId, userId } = await authorize(params, session?.user?.id));
  } catch (res) {
    return res as Response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = CreateCommentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    // Confirm the ticket is still in this workspace, then insert.
    // If it was deleted between the guard and this write, count is 0.
    const comment = await prisma.$transaction(async (tx) => {
      const existing = await tx.ticket.updateMany({
        where: { id: ticketId, workspaceId },
        // Touch updatedAt so a comment counts as activity. The board
        // orders each column by updatedAt, and a new reply is activity.
        data: { updatedAt: new Date() },
      });
      if (existing.count === 0) {
        throw new Response(JSON.stringify({ error: "Ticket not found." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      return tx.comment.create({
        data: {
          body: parsed.data.body,
          ticketId,
          authorId: userId,
        },
        select: commentSelect,
      });
    });

    return Response.json({ comment }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[POST /api/tickets/[id]/comments]", err);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
