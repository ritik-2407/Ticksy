/**
 * The data operations the board UI needs, as an interface.
 *
 * The board, drawer, comment thread, label editor and assignee picker never
 * call fetch themselves. They call a BoardDataSource. Two implementations:
 *
 *   - createApiDataSource (components/kanban/api-data-source.ts)
 *       the real app: talks to /api/* with the visitor's session.
 *   - createDemoStore (lib/demo/demo-store.ts)
 *       the public /demo: in-memory, nothing leaves the browser.
 *
 * Every method rejects with an Error whose message is safe to show to the
 * user as is.
 *
 * Types only, so it is safe in client and server code.
 */

import type { TicketCard } from "@/lib/ticket";

export type BoardLabel = { id: string; name: string; color: string };

export type BoardMember = { id: string; name: string };

export type BoardComment = {
  id: string;
  body: string;
  /** ISO string. The API serialises dates, and the demo does the same. */
  createdAt: string;
  author: { id: string; name: string; image: string | null };
};

/** Same fields as PATCH /api/tickets/[id]. Every field optional. */
export type TicketPatch = {
  title?: string;
  description?: string;
  status?: TicketCard["status"];
  priority?: TicketCard["priority"];
  /** null clears the assignee. */
  assigneeId?: string | null;
  /** The full desired label set, not a delta. */
  labelIds?: string[];
};

export type NewTicketInput = {
  title: string;
  description: string;
  status: TicketCard["status"];
  priority: TicketCard["priority"];
  assigneeId: string | null;
};

export type BoardDataSource = {
  updateTicket(ticketId: string, patch: TicketPatch): Promise<TicketCard>;
  createTicket(input: NewTicketInput): Promise<TicketCard>;
  deleteTicket(ticketId: string): Promise<void>;

  listMembers(): Promise<BoardMember[]>;

  listLabels(): Promise<BoardLabel[]>;
  createLabel(input: { name: string; color: string }): Promise<BoardLabel>;

  listComments(ticketId: string): Promise<BoardComment[]>;
  postComment(ticketId: string, body: string): Promise<BoardComment>;
  editComment(ticketId: string, commentId: string, body: string): Promise<BoardComment>;
};
