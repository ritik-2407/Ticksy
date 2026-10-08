"use client";

/**
 * Ticket detail drawer.
 *
 * Clicking a card opens this panel. Save sends one PATCH with the fields
 * the form owns: title, description, status, priority, assignee.
 * Labels are edited on their own, with the full labelIds set.
 * Admins can delete the ticket. Members cannot.
 *
 * Closing the panel drops unsaved ticket edits. The board only changes
 * after a successful save. A new comment updates the card's comment count.
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
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close ticket"
        className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-drawer-title"
        className="relative z-10 flex h-full w-full max-w-md flex-col
                   bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl
                   border-l border-black/[0.08] dark:border-white/[0.08]
                   shadow-[−8px_0_48px_rgba(0,0,0,0.12)] dark:shadow-[-8px_0_48px_rgba(0,0,0,0.6)]"
      >
        {/* Drawer header */}
        <header className="flex items-center justify-between
                           border-b border-black/[0.07] dark:border-white/[0.07]
                           px-5 py-4">
          <h2 id="ticket-drawer-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Ticket
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
          >
            Close
          </button>
        </header>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <form id="ticket-fields" onSubmit={save} className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="glass-input mt-1 w-full"
                maxLength={200}
                required
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={6}
                className="glass-input mt-1 w-full"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as Ticket["status"])}
                  className="glass-input mt-1 w-full cursor-pointer"
                >
                  {BOARD_COLUMNS.map((column) => (
                    <option key={column.status} value={column.status}>
                      {column.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Priority</span>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as Ticket["priority"])}
                  className="glass-input mt-1 w-full cursor-pointer"
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

            <p className="text-xs text-gray-400 dark:text-gray-600">
              Created by {ticket.createdBy.name}
            </p>
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

        {/* Footer */}
        <footer className="space-y-3 border-t border-black/[0.07] dark:border-white/[0.07] px-5 py-4">
          {error ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
          {role === "ADMIN" ? (
            confirmDelete ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Delete this ticket and its comments?
                </p>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove()}
                    disabled={deleting}
                    className="rounded-md px-2 py-1 text-sm font-medium
                               text-red-700 dark:text-red-400
                               hover:bg-red-50 dark:hover:bg-red-950/40
                               disabled:text-red-300 dark:disabled:text-red-800
                               transition-colors"
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
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
              >
                Delete ticket
              </button>
            )
          ) : null}
          <button
            type="submit"
            form="ticket-fields"
            disabled={!dirty || saving || deleting}
            className="btn-primary w-full"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </footer>
      </aside>
    </div>
  );
}
