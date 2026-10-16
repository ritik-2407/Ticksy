"use client";

/**
 * Ticket detail drawer.
 *
 * Clicking a card opens this panel. Save sends one update with the fields
 * the form owns: title, description, status, priority, assignee.
 * Labels are edited on their own, with the full labelIds set.
 * Admins can delete the ticket. Members cannot.
 *
 * Status, priority and assignee follow lib/ticket-permissions.ts: fields the
 * caller may not change are disabled. The API enforces the same rule.
 *
 * Closing the panel drops unsaved ticket edits. The board only changes
 * after a successful save. A new comment updates the card's comment count.
 */

import { useEffect, useState, type FormEvent } from "react";
import { AssigneePicker } from "@/components/kanban/AssigneePicker";
import { useBoardData } from "@/components/kanban/board-data-context";
import { CommentThread } from "@/components/kanban/CommentThread";
import { LabelEditor } from "@/components/kanban/LabelEditor";
import { BOARD_COLUMNS } from "@/components/kanban/columns";
import type { TicketCard as Ticket } from "@/lib/ticket";
import { getTicketPermissions } from "@/lib/ticket-permissions";
import type { Role } from "@prisma/client";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export function DetailDrawer({
  ticket,
  role,
  currentUserId,
  onClose,
  onSaved,
  onDeleted,
  onCommented,
}: {
  ticket: Ticket;
  role: Role;
  currentUserId: string;
  onClose: () => void;
  onSaved: (ticket: Ticket) => void;
  onDeleted: () => void;
  onCommented: () => void;
}) {
  const api = useBoardData();
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

  // Same policy the API enforces. Controls the caller may not use are
  // disabled so they do not find out through a 403. Computed from the saved
  // ticket, not the form: picking yourself as assignee does not unlock
  // priority until that save lands.
  const allowed = getTicketPermissions({
    role,
    userId: currentUserId,
    assigneeId: ticket.assignee?.id ?? null,
  });
  const someLocked =
    !allowed.canChangeStatus || !allowed.canChangePriority || !allowed.canChangeAssignee;

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
      const saved = await api.updateTicket(ticket.id, {
        title: nextTitle,
        description: description.trim(),
        status,
        priority,
        assigneeId: assigneeId || null,
      });
      setTitle(saved.title);
      setDescription(saved.description);
      setStatus(saved.status);
      setPriority(saved.priority);
      setAssigneeId(saved.assignee?.id ?? "");
      onSaved(saved);
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
      await api.deleteTicket(ticket.id);
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
                  disabled={!allowed.canChangeStatus}
                  className="glass-input mt-1 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
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
                  disabled={!allowed.canChangePriority}
                  className="glass-input mt-1 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {PRIORITIES.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <AssigneePicker
              value={assigneeId}
              onChange={setAssigneeId}
              disabled={!allowed.canChangeAssignee}
            />

            {someLocked ? (
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {ticket.assignee
                  ? `This ticket is assigned to ${ticket.assignee.name}. Only they or an admin can change its status, priority or assignee.`
                  : "Only an admin or the assignee can change priority."}
              </p>
            ) : null}

            <p className="text-xs text-gray-400 dark:text-gray-600">
              Created by {ticket.createdBy.name}
            </p>
          </form>

          <LabelEditor
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
                    className="btn-danger"
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
                className="btn-danger-outline w-full"
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
