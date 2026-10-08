"use client";

/**
 * Creates a ticket with POST /api/workspaces/[slug]/tickets.
 * The board inserts the returned ticket into its own state.
 */

import { useEffect, useState, type FormEvent } from "react";
import { AssigneePicker } from "@/components/kanban/AssigneePicker";
import { BOARD_COLUMNS } from "@/components/kanban/columns";
import type { TicketCard as Ticket } from "@/lib/ticket";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export function NewTicketDialog({
  slug,
  onClose,
  onCreated,
}: {
  slug: string;
  onClose: () => void;
  onCreated: (ticket: Ticket) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Ticket["status"]>("OPEN");
  const [priority, setPriority] = useState<Ticket["priority"]>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError("Title is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${slug}/tickets`, {
        method: "POST",
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
        throw new Error(body.error ?? "Could not create this ticket.");
      }
      onCreated(body.ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create this ticket.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close new ticket"
        className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px]"
        onClick={() => {
          if (!saving) onClose();
        }}
      />

      {/* Dialog */}
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-ticket-title"
        className="relative z-10 w-full max-w-md rounded-2xl
                   bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl
                   border border-black/[0.08] dark:border-white/[0.08]
                   shadow-[0_24px_64px_rgba(0,0,0,0.15)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.7)]
                   p-5"
      >
        <div className="flex items-center justify-between">
          <h2 id="new-ticket-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            New ticket
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost">
            Close
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
              required
              maxLength={200}
              className="glass-input mt-1 w-full"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
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

          {error ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary mt-5 w-full"
        >
          {saving ? "Creating…" : "Create ticket"}
        </button>
      </form>
    </div>
  );
}
