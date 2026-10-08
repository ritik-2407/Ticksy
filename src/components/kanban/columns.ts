/**
 * The four board columns, in left-to-right order.
 * This matches the TicketStatus enum declaration order and the
 * orderBy: { status: "asc" } used by the list query.
 */

import type { TicketCard } from "@/lib/ticket";

type TicketStatus = TicketCard["status"];

export const BOARD_COLUMNS: { status: TicketStatus; title: string }[] = [
  { status: "OPEN", title: "Open" },
  { status: "IN_PROGRESS", title: "In progress" },
  { status: "IN_REVIEW", title: "In review" },
  { status: "DONE", title: "Done" },
];

type Priority = TicketCard["priority"];

/** Urgent first. The board filter and the home counts use this order. */
export const PRIORITIES: { priority: Priority; title: string }[] = [
  { priority: "CRITICAL", title: "Critical" },
  { priority: "HIGH", title: "High" },
  { priority: "MEDIUM", title: "Medium" },
  { priority: "LOW", title: "Low" },
];

export type PriorityFilter = "ALL" | Priority;
export type AssigneeFilter = "ALL" | "UNASSIGNED" | string;

/**
 * Hide tickets that do not match the board filters.
 * ALL leaves that dimension alone. UNASSIGNED keeps tickets with no assignee.
 * The full list stays in state so clearing a filter brings every card back.
 */
export function filterTickets<
  T extends { priority: Priority; assignee: { id: string } | null },
>(tickets: T[], filters: { priority: PriorityFilter; assignee: AssigneeFilter }): T[] {
  return tickets.filter((ticket) => {
    if (filters.priority !== "ALL" && ticket.priority !== filters.priority) return false;
    if (filters.assignee === "UNASSIGNED") return ticket.assignee === null;
    if (filters.assignee !== "ALL") return ticket.assignee?.id === filters.assignee;
    return true;
  });
}

/**
 * Bucket tickets into the four columns.
 * The query already returns newest-updated first within each status,
 * and pushing in that order keeps it.
 */
export function groupTickets(tickets: TicketCard[]): Map<TicketStatus, TicketCard[]> {
  const groups = new Map<TicketStatus, TicketCard[]>(
    BOARD_COLUMNS.map((column) => [column.status, []])
  );

  for (const ticket of tickets) {
    groups.get(ticket.status)?.push(ticket);
  }

  return groups;
}

export function isBoardStatus(value: string): value is TicketStatus {
  return BOARD_COLUMNS.some((column) => column.status === value);
}

/**
 * Move one ticket into another column and place it at the bottom of that column.
 * Returns the same array when the ticket is missing or already in that column.
 * Order inside a column is display-only. The database stores status, not position,
 * so a refresh re-sorts by updatedAt.
 */
export function moveTicket(
  tickets: TicketCard[],
  id: string,
  status: TicketStatus
): TicketCard[] {
  const ticket = tickets.find((item) => item.id === id);
  if (!ticket || ticket.status === status) return tickets;

  const rest = tickets.filter((item) => item.id !== id);
  const lastOfStatus = rest.reduce(
    (last, item, index) => (item.status === status ? index : last),
    -1
  );
  const next = rest.slice();
  next.splice(lastOfStatus + 1, 0, { ...ticket, status });
  return next;
}
