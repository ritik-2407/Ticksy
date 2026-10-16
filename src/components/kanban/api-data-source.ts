/**
 * BoardDataSource backed by the real /api routes.
 *
 * Each method is the fetch call a component used to make inline, moved here
 * unchanged. A non-2xx response rejects with the server's own `error`
 * message, which the components already show as is.
 */

import type { BoardComment, BoardDataSource, BoardLabel } from "@/lib/board-data";
import type { TicketCard } from "@/lib/ticket";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed (${res.status}).`);
  }
  return body;
}

function json(method: string, payload: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

export function createApiDataSource(slug: string): BoardDataSource {
  return {
    async updateTicket(ticketId, patch) {
      const body = await request<{ ticket: TicketCard }>(
        `/api/tickets/${ticketId}`,
        json("PATCH", patch)
      );
      return body.ticket;
    },

    async createTicket(input) {
      const body = await request<{ ticket: TicketCard }>(
        `/api/workspaces/${slug}/tickets`,
        json("POST", input)
      );
      return body.ticket;
    },

    async deleteTicket(ticketId) {
      await request<{ ok: true }>(`/api/tickets/${ticketId}`, { method: "DELETE" });
    },

    async listMembers() {
      const body = await request<{ members: { user: { id: string; name: string } }[] }>(
        `/api/workspaces/${slug}/members`
      );
      return body.members.map((member) => ({ id: member.user.id, name: member.user.name }));
    },

    async listLabels() {
      const body = await request<{ labels: BoardLabel[] }>(
        `/api/workspaces/${slug}/labels`
      );
      return body.labels;
    },

    async createLabel(input) {
      const body = await request<{ label: BoardLabel }>(
        `/api/workspaces/${slug}/labels`,
        json("POST", input)
      );
      return body.label;
    },

    async listComments(ticketId) {
      const body = await request<{ comments: BoardComment[] }>(
        `/api/tickets/${ticketId}/comments`
      );
      return body.comments;
    },

    async postComment(ticketId, text) {
      const body = await request<{ comment: BoardComment }>(
        `/api/tickets/${ticketId}/comments`,
        json("POST", { body: text })
      );
      return body.comment;
    },

    async editComment(ticketId, commentId, text) {
      const body = await request<{ comment: BoardComment }>(
        `/api/tickets/${ticketId}/comments/${commentId}`,
        json("PATCH", { body: text })
      );
      return body.comment;
    },
  };
}
