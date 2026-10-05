/**
 * Shared ticket shape and assignee check.
 *
 * List, create, detail, and update all return this select so a card on the
 * board and a ticket you just edited are the same object.
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const ticketSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  createdAt: true,
  updatedAt: true,
  assignee: {
    select: { id: true, name: true, image: true },
  },
  createdBy: {
    select: { id: true, name: true, image: true },
  },
  labels: {
    select: { id: true, name: true, color: true },
  },
  _count: {
    select: { comments: true },
  },
} satisfies Prisma.TicketSelect;

/** One ticket, as returned by list, create, detail, and the board. */
export type TicketCard = Prisma.TicketGetPayload<{ select: typeof ticketSelect }>;

/**
 * Throws 400 when assigneeId is set and that user has no membership
 * in this workspace. null / undefined means "leave unassigned" and is allowed.
 *
 * Call this before every write that sets assigneeId (create and update).
 */
export async function ensureAssigneeIsMember(
  workspaceId: string,
  assigneeId: string | null | undefined
): Promise<void> {
  if (!assigneeId) return;

  const member = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: { userId: assigneeId, workspaceId },
    },
    select: { id: true },
  });

  if (!member) {
    throw new Response(
      JSON.stringify({ error: "Assignee must be a member of this workspace." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Checks that every label id lives in this workspace, and returns the
 * de-duplicated list. An empty array is valid: it means "clear all labels".
 *
 * A label from another workspace and a label that does not exist get the
 * same 400. Saying "not found" for one and "wrong workspace" for the other
 * would tell the caller which ids are real in a tenant they do not belong to.
 */
export async function ensureLabelsInWorkspace(
  workspaceId: string,
  labelIds: string[]
): Promise<string[]> {
  const unique = [...new Set(labelIds)];
  if (unique.length === 0) return unique;

  const found = await prisma.label.findMany({
    where: { workspaceId, id: { in: unique } },
    select: { id: true },
  });

  if (found.length !== unique.length) {
    throw new Response(
      JSON.stringify({ error: "Every label must belong to this workspace." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  return unique;
}
