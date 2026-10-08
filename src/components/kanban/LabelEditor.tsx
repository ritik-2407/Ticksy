"use client";

/**
 * Workspace labels on one ticket — toggle attach/detach, create new labels (admin only).
 */

import { useEffect, useState, type FormEvent } from "react";
import type { TicketCard as Ticket } from "@/lib/ticket";
import type { Role } from "@prisma/client";

type Label = { id: string; name: string; color: string };

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#6b7280"];

export function LabelEditor({
  slug,
  ticketId,
  labels,
  role,
  onUpdated,
}: {
  slug: string;
  ticketId: string;
  labels: Label[];
  role: Role;
  onUpdated: (ticket: Ticket) => void;
}) {
  const [catalog, setCatalog] = useState<Label[]>([]);
  const [selectedIds, setSelectedIds] = useState(() => labels.map((label) => label.id));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [creating, setCreating] = useState(false);

  const attachedKey = labels.map((label) => label.id).join("\0");

  useEffect(() => {
    setSelectedIds(attachedKey ? attachedKey.split("\0") : []);
  }, [attachedKey]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/workspaces/${slug}/labels`)
      .then(async (res) => {
        const body = (await res.json()) as { labels?: Label[]; error?: string };
        if (!res.ok) throw new Error(body.error ?? "Could not load labels");
        if (!cancelled) setCatalog(body.labels ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load labels");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function toggle(labelId: string) {
    if (busy) return;
    const previous = selectedIds;
    const next = selectedIds.includes(labelId)
      ? selectedIds.filter((id) => id !== labelId)
      : [...selectedIds, labelId];

    setSelectedIds(next);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelIds: next }),
      });
      const body = (await res.json()) as { ticket?: Ticket; error?: string };
      if (!res.ok || !body.ticket) {
        throw new Error(body.error ?? "Could not update labels.");
      }
      setSelectedIds(body.ticket.labels.map((label) => label.id));
      onUpdated(body.ticket);
    } catch (err) {
      setSelectedIds(previous);
      setError(err instanceof Error ? err.message : "Could not update labels.");
    } finally {
      setBusy(false);
    }
  }

  async function createLabel(event: FormEvent) {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName || creating) return;

    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${slug}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName, color }),
      });
      const body = (await res.json()) as { label?: Label; error?: string };
      if (!res.ok || !body.label) {
        throw new Error(body.error ?? "Could not create this label.");
      }
      const created = body.label;
      setCatalog((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create this label.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section
      className="mt-6 border-t border-black/[0.06] dark:border-white/[0.06] pt-4"
      aria-label="Labels"
    >
      <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">Labels</h3>

      {loading ? (
        <p className="mt-3 text-sm text-gray-400 dark:text-gray-600">Loading labels…</p>
      ) : catalog.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400 dark:text-gray-600">No labels yet.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {catalog.map((label) => {
            const on = selectedIds.includes(label.id);
            return (
              <li key={label.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  disabled={busy}
                  onClick={() => void toggle(label.id)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5
                              text-xs transition-all duration-150 disabled:opacity-60 ${
                    on
                      ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                      : "border-black/[0.1] dark:border-white/[0.15] bg-black/[0.03] dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 hover:bg-black/[0.06] dark:hover:bg-white/[0.1]"
                  }`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: label.color }}
                    aria-hidden
                  />
                  {label.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {role === "ADMIN" ? (
        <form onSubmit={createLabel} className="mt-3 space-y-2">
          <label className="block">
            <span className="sr-only">New label name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              placeholder="New label"
              className="glass-input w-full"
            />
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Label color">
            {COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={swatch}
                aria-pressed={color === swatch}
                onClick={() => setColor(swatch)}
                className={`h-5 w-5 rounded-full transition-all duration-150 ${
                  color === swatch
                    ? "ring-2 ring-gray-900 dark:ring-white ring-offset-2 dark:ring-offset-zinc-900 scale-110"
                    : "hover:scale-110"
                }`}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={creating || name.trim().length === 0}
            className="btn-primary !px-3 !py-1.5"
          >
            {creating ? "Adding…" : "Add label"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </section>
  );
}
