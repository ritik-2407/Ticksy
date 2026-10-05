/**
 * /api/workspaces/[slug]/tickets
 *
 * GET  — list tickets in this workspace (optional status / priority / assignee filters)
 * POST — create a ticket. The caller becomes createdBy. Any member can create.
 *
 * GET /api/workspaces/[slug]/tickets
 *
 * Lists tickets inside one workspace. Any member can call this.
 *
 * Query string (all optional):
 *   ?status=OPEN|IN_PROGRESS|IN_REVIEW|DONE
 *   ?priority=LOW|MEDIUM|HIGH|CRITICAL
 *   ?assigneeId=<user cuid>
 *
 * Example:
 *   GET /api/workspaces/acme-corp/tickets?status=OPEN
 *
 * WHY every query includes workspaceId:
 *   Tickets from workspace A must never appear in workspace B.
 *   requireMembership() already proved the caller belongs here and handed
 *   us workspaceId. We put that id in the WHERE clause — we never trust a
 *   workspace id sent by the client.
 *
 * WHY the @@index([workspaceId, status]) matters:
 *   The common board query is "OPEN tickets in this workspace".
 *   Postgres can satisfy that with the composite index instead of scanning
 *   every ticket in the database. Filtering by priority uses the other
 *   index, @@index([workspaceId, priority]).
 *
 * Responses:
 *   200  { tickets }
 *   400  { error, issues }   — bad query param
 *   401  { error }           — not signed in
 *   403  { error }           — not a member of this workspace
 *   500  { error }
 */

import { auth } from "@/auth";
import { requireMembership } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { ensureAssigneeIsMember, ticketSelect } from "@/lib/ticket";
import { Priority, TicketStatus } from "@prisma/client";
import { z } from "zod";

const CreateTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  description: z
    .string()
    .trim()
    .max(20_000, "Description must be at most 20,000 characters")
    .optional()
    .default(""),
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  // null or omitted = unassigned. A cuid must be a member of THIS workspace.
  assigneeId: z.string().cuid().nullable().optional(),
});

// ─── Query validation ────────────────────────────────────────────────────────

const ListTicketsQuery = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assigneeId: z.string().cuid().optional(),
});

/**
 * URLSearchParams.get() returns null when the key is missing and "" when
 * the client sent ?status= with no value. Both mean "no filter".
 */
function readParam(searchParams: URLSearchParams, key: string): string | undefined {
  const value = searchParams.get(key);
  if (!value) return undefined;
  return value;
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();

  let workspaceId: string;
  try {
    const { slug } = await params;
    ({ workspaceId } = await requireMembership(slug, session?.user?.id));
  } catch (res) {
    return res as Response;
  }

  const url = new URL(req.url);
  const parsed = ListTicketsQuery.safeParse({
    status: readParam(url.searchParams, "status"),
    priority: readParam(url.searchParams, "priority"),
    assigneeId: readParam(url.searchParams, "assigneeId"),
  });

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid query.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { status, priority, assigneeId } = parsed.data;

  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        workspaceId,
        // Spread only the filters the client actually sent.
        // An undefined field is omitted, so we don't filter on it.
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(assigneeId ? { assigneeId } : {}),
      },
      orderBy: [
        // Enum declaration order is OPEN → IN_PROGRESS → IN_REVIEW → DONE,
        // which is also the left-to-right order of the board columns.
        { status: "asc" },
        { updatedAt: "desc" },
      ],
      select: ticketSelect,
    });

    return Response.json({ tickets });
  } catch (err) {
    console.error("[GET /api/workspaces/[slug]/tickets]", err);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/workspaces/[slug]/tickets
 *
 * Creates a ticket in this workspace. Any member can call this.
 *
 * Request body:
 *   { "title": "Login button does nothing", "description": "Steps..." }
 * Optional:
 *   status      OPEN | IN_PROGRESS | IN_REVIEW | DONE   (default OPEN)
 *   priority    LOW | MEDIUM | HIGH | CRITICAL          (default MEDIUM)
 *   assigneeId  a member's user id, or null to leave unassigned
 *
 * The client does NOT send workspaceId or createdById.
 *   workspaceId comes from the guard (the slug in the URL).
 *   createdById is the signed-in user. Letting the client pick either
 *   would let someone file a ticket into another tenant or impersonate
 *   the author.
 *
 * Responses:
 *   201  { ticket }          — same shape as one item in the GET list
 *   400  { error, issues }   — Zod failed, or assignee is not a member
 *   401  { error }
 *   403  { error }
 *   500  { error }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();

  let workspaceId: string;
  let userId: string;
  try {
    const { slug } = await params;
    ({ workspaceId, userId } = await requireMembership(slug, session?.user?.id));
  } catch (res) {
    return res as Response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = CreateTicketSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid input.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { title, description, status, priority, assigneeId } = parsed.data;

  try {
    // An assignee from another workspace would show up on this board.
    // Membership is the only proof they belong here.
    await ensureAssigneeIsMember(workspaceId, assigneeId);
    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        workspaceId,
        createdById: userId,
        // Omit status/priority when absent so the schema defaults apply
        // (OPEN and MEDIUM). Passing undefined is the same as omitting.
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(assigneeId ? { assigneeId } : {}),
      },
      select: ticketSelect,
    });

    return Response.json({ ticket }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[POST /api/workspaces/[slug]/tickets]", err);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
