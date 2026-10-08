/**
 * /api/tickets/[id]
 *
 * GET    — one ticket, same shape as a card in the list
 * PATCH  — change title, description, status, priority, assignee, and/or labels
 * DELETE — remove the ticket. ADMIN only. Comments are deleted with it.
 *
 * This URL has no workspace slug. requireTicket() loads the ticket, checks
 * the caller is a member of its workspace, and returns 404 both when the
 * id does not exist and when it belongs to another tenant.
 *
 * The client cannot change workspaceId or createdById. Those are not in
 * the schema, and Zod strips unknown keys before we touch Prisma.
 *
 * PATCH body — every field optional, at least one required:
 *   { "status": "IN_PROGRESS" }
 *   { "priority": "HIGH", "assigneeId": "<member user id>" }
 *   { "assigneeId": null }          ← clears the assignee
 *   { "title": "New title", "description": "..." }
 *   { "labelIds": ["<label cuid>", "<label cuid>"] }  ← replaces the whole set
 *   { "labelIds": [] }          ← clears every label
 *
 * labelIds is the desired set, not a delta. Omitting it leaves labels alone.
 * Every id must already exist in this workspace (create them with POST
 * /api/workspaces/[slug]/labels). A label from another workspace is rejected.
 *
 * Responses:
 *   200  { ticket }          — GET, PATCH
 *   200  { ok: true }        — DELETE
 *   400  { error, issues }   — empty body, bad enum, assignee, or foreign label
 *   401  { error }
 *   403  { error }           — DELETE by someone who is not an admin
 *   404  { error }           — missing, or not in a workspace you belong to
 *   500  { error }
 */

import { auth } from "@/auth";
import { requireTicket, requireTicketAdmin } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { ensureAssigneeIsMember, ensureLabelsInWorkspace, ticketSelect } from "@/lib/ticket";
import { Prisma, Priority, TicketStatus } from "@prisma/client";
import { z } from "zod";

const PatchTicketSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must be at most 200 characters")
      .optional(),
    description: z
      .string()
      .trim()
      .max(20_000, "Description must be at most 20,000 characters")
      .optional(),
    status: z.nativeEnum(TicketStatus).optional(),
    priority: z.nativeEnum(Priority).optional(),
    // null clears the assignee. A cuid must be a member of this workspace.
    assigneeId: z.string().cuid().nullable().optional(),
    // The full set of labels this ticket should have. [] clears them.
    // Omitted (undefined) means "do not touch labels".
    labelIds: z
      .array(z.string().cuid())
      .max(20, "A ticket can have at most 20 labels.")
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

async function authorize(
  params: Promise<{ id: string }>,
  userId: string | undefined
) {
  const { id } = await params;
  // A random string is not a ticket id. 404, same as a real id you can't see.
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
    // workspaceId in the WHERE is the second lock. requireTicket already
    // checked membership; this query still cannot return another tenant's row.
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, workspaceId },
      select: ticketSelect,
    });

    if (!ticket) {
      return Response.json({ error: "Ticket not found." }, { status: 404 });
    }

    return Response.json({ ticket });
  } catch (err) {
    console.error("[GET /api/tickets/[id]]", err);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = PatchTicketSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid input.",
        issues: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { title, description, status, priority, assigneeId, labelIds } = parsed.data;

  // Scalar columns go through updateMany, which can filter by workspaceId.
  // The label relation cannot: Prisma rejects nested writes on updateMany.
  // Those two writes share one transaction so a bad label set cannot leave
  // the title already changed.
  const data: Prisma.TicketUpdateManyMutationInput = {
    ...(title !== undefined ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(priority !== undefined ? { priority } : {}),
    // null is a real write: it clears the assignee. undefined means
    // "this field was not in the body" and must be left alone.
    ...(assigneeId !== undefined ? { assigneeId } : {}),
  };

  try {
    await ensureAssigneeIsMember(workspaceId, assigneeId);
    const nextLabelIds =
      labelIds === undefined ? undefined : await ensureLabelsInWorkspace(workspaceId, labelIds);

    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        // If the ticket vanished between the guard and this write, count is 0.
        const result = await tx.ticket.updateMany({
          where: { id: ticketId, workspaceId },
          data,
        });
        if (result.count === 0) throw ticketNotFound();
      } else if (nextLabelIds !== undefined) {
        const existing = await tx.ticket.findFirst({
          where: { id: ticketId, workspaceId },
          select: { id: true },
        });
        if (!existing) throw ticketNotFound();
      }

      if (nextLabelIds !== undefined) {
        // set replaces the join rows. The ids were already checked against
        // this workspace, and the ticket cannot move to another workspace.
        await tx.ticket.update({
          where: { id: ticketId },
          data: {
            labels: { set: nextLabelIds.map((id) => ({ id })) },
          },
        });
      }
    });

    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, workspaceId },
      select: ticketSelect,
    });

    if (!ticket) {
      return Response.json({ error: "Ticket not found." }, { status: 404 });
    }

    return Response.json({ ticket });
  } catch (err) {
    if (err instanceof Response) return err;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return Response.json({ error: "Ticket not found." }, { status: 404 });
    }
    console.error("[PATCH /api/tickets/[id]]", err);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;

  // A random string is not a ticket id. 404, same as a real id you can't see.
  // Check this before the query so Prisma never sees a non-cuid.
  if (!z.string().cuid().safeParse(id).success) {
    return ticketNotFound();
  }

  let ticketId: string;
  let workspaceId: string;
  try {
    // Members can edit a ticket. Removing one is an admin action.
    // requireTicketAdmin returns 404 for a stranger and 403 for a member.
    ({ ticketId, workspaceId } = await requireTicketAdmin(id, session?.user?.id));
  } catch (res) {
    return res as Response;
  }

  try {
    const result = await prisma.ticket.deleteMany({
      where: { id: ticketId, workspaceId },
    });
    if (result.count === 0) {
      return Response.json({ error: "Ticket not found." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/tickets/[id]]", err);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}

function ticketNotFound(): Response {
  return new Response(JSON.stringify({ error: "Ticket not found." }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}
