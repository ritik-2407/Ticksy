/**
 * In-memory backend for the public /demo.
 *
 * It implements BoardDataSource, so the real board UI runs on it unchanged.
 * Nothing here touches the network, the database or a cookie: state lives in
 * the closure and disappears on refresh. That is deliberate. An anonymous
 * visitor must never be able to write to shared storage.
 *
 * It follows the same rules as the API so the demo shows the real product:
 *   - permissions come from lib/ticket-permissions.ts (the same function the
 *     PATCH route calls), so "assigned to someone else" locks work here too
 *   - the same validation limits as the Zod schemas in the routes
 *   - only admins delete tickets and create labels
 *   - you can edit only your own comments
 *
 * The visitor is "You". They start as ADMIN and can switch to MEMBER from
 * the demo banner to see what a non-admin is allowed to do.
 */

import type {
  BoardComment,
  BoardDataSource,
  BoardLabel,
  BoardMember,
  NewTicketInput,
  TicketPatch,
} from "@/lib/board-data";
import { DEMO_COMMENTS, DEMO_LABELS, DEMO_MEMBERS, DEMO_TICKETS, DEMO_USER } from "@/lib/demo/demo-data";
import type { TicketCard } from "@/lib/ticket";
import { checkTicketEdit } from "@/lib/ticket-permissions";
import type { Role } from "@prisma/client";

export { DEMO_USER };

const STATUS_ORDER: Record<TicketCard["status"], number> = {
  OPEN: 0,
  IN_PROGRESS: 1,
  IN_REVIEW: 2,
  DONE: 3,
};

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

// Same ceilings as the API schemas.
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 20_000;
const MAX_LABELS = 20;
const MAX_LABEL_NAME = 40;
const MAX_COMMENT = 10_000;

export type DemoStore = BoardDataSource & {
  /** The visitor's role. Drives every permission check below. */
  setRole(role: Role): void;
  /** Tickets as the board's server query would return them. */
  listTickets(): TicketCard[];
  readonly members: BoardMember[];
};

type StoredComment = BoardComment & { ticketId: string };

export function createDemoStore(now: number = Date.now()): DemoStore {
  let role: Role = "ADMIN";
  let nextId = 1000;
  const newId = (prefix: string) => `${prefix}-${nextId++}`;

  const members: BoardMember[] = DEMO_MEMBERS.map((member) => ({ ...member }));
  const labels: BoardLabel[] = DEMO_LABELS.map((label) => ({ ...label }));

  const comments: StoredComment[] = DEMO_COMMENTS.map((comment) => ({
    id: comment.id,
    ticketId: comment.ticketId,
    body: comment.body,
    createdAt: new Date(now - comment.minutesAgo * MINUTE).toISOString(),
    author: { ...comment.author, image: null },
  }));

  const tickets: TicketCard[] = DEMO_TICKETS.map((seed) => {
    const assignee = seed.assigneeId ? members.find((m) => m.id === seed.assigneeId) : undefined;
    const createdBy = members.find((m) => m.id === seed.createdById) ?? members[0];
    return {
      id: seed.id,
      title: seed.title,
      description: seed.description,
      status: seed.status,
      priority: seed.priority,
      createdAt: new Date(now - seed.daysAgo * DAY),
      updatedAt: new Date(now - seed.updatedMinutesAgo * MINUTE),
      assignee: assignee ? { ...assignee, image: null } : null,
      createdBy: { id: createdBy.id, name: createdBy.name, image: null },
      labels: seed.labelIds.flatMap((id) => labels.filter((label) => label.id === id)),
      _count: { comments: 0 },
    };
  });
  for (const ticket of tickets) {
    ticket._count.comments = comments.filter((c) => c.ticketId === ticket.id).length;
  }

  // Callers get copies. The board keeps what it is handed in React state,
  // and a shared reference would let a UI mutation leak back into the store.
  function copy(ticket: TicketCard): TicketCard {
    return {
      ...ticket,
      assignee: ticket.assignee ? { ...ticket.assignee } : null,
      createdBy: { ...ticket.createdBy },
      labels: ticket.labels.map((label) => ({ ...label })),
      _count: { ...ticket._count },
    };
  }

  function findTicket(ticketId: string): TicketCard {
    const ticket = tickets.find((item) => item.id === ticketId);
    if (!ticket) throw new Error("Ticket not found.");
    return ticket;
  }

  function checkTitle(value: string): string {
    const title = value.trim();
    if (!title) throw new Error("Title is required.");
    if (title.length > MAX_TITLE) throw new Error(`Title must be at most ${MAX_TITLE} characters.`);
    return title;
  }

  function checkDescription(value: string): string {
    const description = value.trim();
    if (description.length > MAX_DESCRIPTION) {
      throw new Error(`Description must be at most ${MAX_DESCRIPTION.toLocaleString("en")} characters.`);
    }
    return description;
  }

  function resolveAssignee(assigneeId: string | null): TicketCard["assignee"] {
    if (assigneeId === null) return null;
    const member = members.find((item) => item.id === assigneeId);
    if (!member) throw new Error("Assignee must be a member of this workspace.");
    return { ...member, image: null };
  }

  function resolveLabels(labelIds: string[]): BoardLabel[] {
    const unique = [...new Set(labelIds)];
    if (unique.length > MAX_LABELS) {
      throw new Error(`A ticket can have at most ${MAX_LABELS} labels.`);
    }
    const found = labels.filter((label) => unique.includes(label.id));
    if (found.length !== unique.length) {
      throw new Error("Every label must belong to this workspace.");
    }
    // Keep the order the caller chose.
    return unique.map((id) => found.find((label) => label.id === id) as BoardLabel);
  }

  return {
    setRole(next) {
      role = next;
    },

    get members() {
      return members.map((member) => ({ ...member }));
    },

    listTickets() {
      return tickets
        .slice()
        .sort(
          (a, b) =>
            STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
            b.updatedAt.getTime() - a.updatedAt.getTime()
        )
        .map(copy);
    },

    async updateTicket(ticketId, patch: TicketPatch) {
      const ticket = findTicket(ticketId);
      if (Object.keys(patch).length === 0) {
        throw new Error("Provide at least one field to update.");
      }

      // Validate everything before applying anything: a rejected save must
      // leave the ticket exactly as it was.
      const title = patch.title !== undefined ? checkTitle(patch.title) : undefined;
      const description =
        patch.description !== undefined ? checkDescription(patch.description) : undefined;
      const assignee =
        patch.assigneeId !== undefined ? resolveAssignee(patch.assigneeId) : undefined;
      const nextLabels = patch.labelIds !== undefined ? resolveLabels(patch.labelIds) : undefined;

      const verdict = checkTicketEdit({
        role,
        userId: DEMO_USER.id,
        current: {
          assigneeId: ticket.assignee?.id ?? null,
          status: ticket.status,
          priority: ticket.priority,
        },
        changes: {
          status: patch.status,
          priority: patch.priority,
          assigneeId: patch.assigneeId,
        },
      });
      if (!verdict.ok) throw new Error(verdict.error);

      if (title !== undefined) ticket.title = title;
      if (description !== undefined) ticket.description = description;
      if (patch.status !== undefined) ticket.status = patch.status;
      if (patch.priority !== undefined) ticket.priority = patch.priority;
      if (assignee !== undefined) ticket.assignee = assignee;
      if (nextLabels !== undefined) ticket.labels = nextLabels;
      ticket.updatedAt = new Date();

      return copy(ticket);
    },

    async createTicket(input: NewTicketInput) {
      const title = checkTitle(input.title);
      const description = checkDescription(input.description);
      const assignee = resolveAssignee(input.assigneeId);

      const created: TicketCard = {
        id: newId("demo-ticket"),
        title,
        description,
        status: input.status,
        priority: input.priority,
        createdAt: new Date(),
        updatedAt: new Date(),
        assignee,
        createdBy: { id: DEMO_USER.id, name: DEMO_USER.name, image: null },
        labels: [],
        _count: { comments: 0 },
      };
      tickets.push(created);
      return copy(created);
    },

    async deleteTicket(ticketId) {
      const ticket = findTicket(ticketId);
      if (role !== "ADMIN") throw new Error("Only an admin can delete tickets.");
      tickets.splice(tickets.indexOf(ticket), 1);
      for (let i = comments.length - 1; i >= 0; i--) {
        if (comments[i].ticketId === ticketId) comments.splice(i, 1);
      }
    },

    async listMembers() {
      return members.map((member) => ({ ...member }));
    },

    async listLabels() {
      return labels
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((label) => ({ ...label }));
    },

    async createLabel({ name, color }) {
      if (role !== "ADMIN") throw new Error("Only an admin can create labels.");
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Name is required.");
      if (trimmed.length > MAX_LABEL_NAME) {
        throw new Error(`Name must be at most ${MAX_LABEL_NAME} characters.`);
      }
      if (labels.some((label) => label.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error(`A label named "${trimmed}" already exists.`);
      }
      const created: BoardLabel = { id: newId("demo-label"), name: trimmed, color };
      labels.push(created);
      return { ...created };
    },

    async listComments(ticketId) {
      findTicket(ticketId);
      return comments
        .filter((comment) => comment.ticketId === ticketId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(publicComment);
    },

    async postComment(ticketId, text) {
      const ticket = findTicket(ticketId);
      const body = checkComment(text);
      const created: StoredComment = {
        id: newId("demo-comment"),
        ticketId,
        body,
        createdAt: new Date().toISOString(),
        author: { id: DEMO_USER.id, name: DEMO_USER.name, image: null },
      };
      comments.push(created);
      ticket._count.comments += 1;
      return publicComment(created);
    },

    async editComment(ticketId, commentId, text) {
      findTicket(ticketId);
      const comment = comments.find((item) => item.id === commentId && item.ticketId === ticketId);
      if (!comment) throw new Error("Comment not found.");
      if (comment.author.id !== DEMO_USER.id) {
        throw new Error("You can only edit your own comments.");
      }
      comment.body = checkComment(text);
      return publicComment(comment);
    },
  };
}

function checkComment(value: string): string {
  const body = value.trim();
  if (!body) throw new Error("Comment cannot be empty.");
  if (body.length > MAX_COMMENT) {
    throw new Error(`Comment must be at most ${MAX_COMMENT.toLocaleString("en")} characters.`);
  }
  return body;
}

function publicComment(comment: StoredComment): BoardComment {
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt,
    author: { ...comment.author },
  };
}
