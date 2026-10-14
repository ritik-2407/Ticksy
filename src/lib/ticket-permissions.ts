/**
 * Who may change what on a ticket.
 *
 * This file is the single source of truth. The PATCH route enforces it, and
 * the board and drawer import the same functions to disable controls. The UI
 * copy is a convenience. The route is the real lock.
 *
 * It has no Prisma or server imports, so it is safe in client components.
 *
 * THE POLICY
 *   An "owned" ticket has an assignee. An "unowned" ticket does not.
 *
 *   Action                      Admin   Assignee   Other member
 *   Title, description, labels  yes     yes        yes
 *   Assign an unowned ticket    yes     n/a        yes (to anyone)
 *   Reassign / unassign owned   yes     yes        no
 *   Change status, unowned      yes     n/a        yes
 *   Change status, owned        yes     yes        no
 *   Change priority             yes     yes        no
 *   Delete                      yes     no         no      (requireTicketAdmin)
 *
 * Why unowned tickets are open: every new ticket starts unassigned. If only
 * an admin could move those, nobody else could pick up work.
 *
 * Why owned tickets are not: it stops one member quietly stealing, reassigning
 * or closing another member's work.
 *
 * Rules are checked against the ticket as it is NOW, before the request is
 * applied. A field only counts as "changed" when its value differs from the
 * current one. The drawer sends every field on each save, so unchanged
 * status, priority and assignee must not trigger a permission check.
 */

import type { Role } from "@prisma/client";

export type TicketState = {
  assigneeId: string | null;
  status: string;
  priority: string;
};

/** The restricted fields a request is trying to write. undefined = not sent. */
export type TicketChanges = {
  status?: string;
  priority?: string;
  assigneeId?: string | null;
};

export type TicketPermissions = {
  canChangeStatus: boolean;
  canChangePriority: boolean;
  canChangeAssignee: boolean;
};

export function getTicketPermissions({
  role,
  userId,
  assigneeId,
}: {
  role: Role;
  userId: string;
  assigneeId: string | null;
}): TicketPermissions {
  const isAdmin = role === "ADMIN";
  const isAssignee = assigneeId !== null && assigneeId === userId;
  const isUnowned = assigneeId === null;

  return {
    canChangeStatus: isAdmin || isAssignee || isUnowned,
    canChangeAssignee: isAdmin || isAssignee || isUnowned,
    canChangePriority: isAdmin || isAssignee,
  };
}

/** Which restricted fields differ from the current ticket. */
export function changedRestrictedFields(
  current: TicketState,
  changes: TicketChanges
): { status: boolean; priority: boolean; assignee: boolean } {
  return {
    status: changes.status !== undefined && changes.status !== current.status,
    priority: changes.priority !== undefined && changes.priority !== current.priority,
    assignee: changes.assigneeId !== undefined && changes.assigneeId !== current.assigneeId,
  };
}

export type EditCheck = { ok: true } | { ok: false; error: string };

/**
 * Decides whether this caller may apply these changes to this ticket.
 * Returns the first violation, with a message the UI can show as is.
 */
export function checkTicketEdit({
  role,
  userId,
  current,
  changes,
}: {
  role: Role;
  userId: string;
  current: TicketState;
  changes: TicketChanges;
}): EditCheck {
  const allowed = getTicketPermissions({
    role,
    userId,
    assigneeId: current.assigneeId,
  });
  const changed = changedRestrictedFields(current, changes);

  if (changed.assignee && !allowed.canChangeAssignee) {
    return {
      ok: false,
      error: "Only the assignee or an admin can reassign this ticket.",
    };
  }
  if (changed.status && !allowed.canChangeStatus) {
    return {
      ok: false,
      error: "Only the assignee or an admin can change the status of this ticket.",
    };
  }
  if (changed.priority && !allowed.canChangePriority) {
    return {
      ok: false,
      error: "Only the assignee or an admin can change the priority of this ticket.",
    };
  }
  return { ok: true };
}

/**
 * Throwing form, matching lib/guard.ts: either the request passes or it
 * dies here with a 403.
 */
export function assertCanEditTicket(args: Parameters<typeof checkTicketEdit>[0]): void {
  const result = checkTicketEdit(args);
  if (!result.ok) {
    throw new Response(JSON.stringify({ error: result.error }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}
