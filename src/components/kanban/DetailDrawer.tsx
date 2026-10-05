"use client";

/**
 * Ticket detail drawer.
 *
 * Clicking a card opens this panel. Save sends one PATCH with the fields
 * the form owns: title, description, status, priority, assignee.
 * Labels are edited on their own, with the full labelIds set.
 *
 * Comments are a separate form under the fields. Posting or editing one
 * does not save or discard the ticket edits above it.
 * Admins can delete the ticket. Members cannot.
 *
 * Closing the panel drops unsaved ticket edits. The board only changes
 * after a successful save, using the ticket object the API returns.
 * A new comment updates the card's comment count on its own.
 */

import { useEffect, useState, type FormEvent } from "react";
import { AssigneePicker } from "@/components/kanban/AssigneePicker";
import { CommentThread } from "@/components/kanban/CommentThread";
import { LabelEditor } from "@/components/kanban/LabelEditor";
import { BOARD_COLUMNS } from "@/components/kanban/columns";
import type { TicketCard as Ticket } from "@/lib/ticket";
import type { Role } from "@prisma/client";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export function DetailDrawer({
  ticket,
  slug,
  role,
  currentUserId,
  onClose,
  onSaved,
  onDeleted,
  onCommented,
}: {
  ticket: Ticket;
  slug: string;
  role: Role;
  currentUserId: string;
  onClose: () => void;
  onSaved: (ticket: Ticket) => void;
  onDeleted: () => void;
  onCommented: () => void;
}) {
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description);
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [assigneeId, setAssigneeId] = useState(ticket.assignee?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dirty =
    title !== ticket.title ||
    description !== ticket.description ||
    status !== ticket.status ||
    priority !== ticket.priority ||
    assigneeId !== (ticket.assignee?.id ?? "");

  async function save(event: FormEvent) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError("Title is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: nextTitle,
          description: description.trim(),
          status,
          priority,
          assigneeId: assigneeId || null,
        }),
      });
      const body = (await res.json()) as { ticket?: Ticket; error?: string };
      if (!res.ok || !body.ticket) {
        throw new Error(body.error ?? "Could not save this ticket.");
      }
      setTitle(body.ticket.title);
      setDescription(body.ticket.description);
      setStatus(body.ticket.status);
      setPriority(body.ticket.priority);
      setAssigneeId(body.ticket.assignee?.id ?? "");
      onSaved(body.ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this ticket.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, { method: "DELETE" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not delete this ticket.");
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this ticket.");
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close ticket"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-drawer-title"
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 id="ticket-drawer-title" className="text-sm font-semibold text-gray-900">
            Ticket
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <form id="ticket-fields" onSubmit={save} className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                maxLength={200}
                required
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-500">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={6}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-gray-500">Status</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as Ticket["status"])}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                >
                  {BOARD_COLUMNS.map((column) => (
                    <option key={column.status} value={column.status}>
                      {column.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-500">Priority</span>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as Ticket["priority"])}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                >
                  {PRIORITIES.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <AssigneePicker slug={slug} value={assigneeId} onChange={setAssigneeId} />

            <p className="text-xs text-gray-400">Created by {ticket.createdBy.name}</p>
          </form>

          <LabelEditor
            slug={slug}
            ticketId={ticket.id}
            labels={ticket.labels}
            role={role}
            onUpdated={onSaved}
          />

          <CommentThread
            ticketId={ticket.id}
            currentUserId={currentUserId}
            onPosted={onCommented}
          />
        </div>

        <footer className="space-y-3 border-t border-gray-200 px-5 py-4">
          {error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : null}
          {role === "ADMIN" ? (
            confirmDelete ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-600">Delete this ticket and its comments?</p>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove()}
                    disabled={deleting}
                    className="rounded-md px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:text-red-300"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(true);
                  setError(null);
                }}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Delete ticket
              </button>
            )
          ) : null}
          <button
            type="submit"
            form="ticket-fields"
            disabled={!dirty || saving || deleting}
            className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </footer>
      </aside>
    </div>
  );
}
