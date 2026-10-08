"use client";

/**
 * Admin controls: name, slug, label catalog, deletion.
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceNav } from "@/components/shell/WorkspaceNav";

type Label = { id: string; name: string; color: string };

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#6b7280"];

export function WorkspaceSettings({
  workspaceName,
  slug,
  labels: initialLabels,
}: {
  workspaceName: string;
  slug: string;
  labels: Label[];
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="glass-header flex flex-wrap items-center gap-3 px-6 py-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">{workspaceName}</h1>
          <span className="text-sm text-gray-400 dark:text-gray-500">/{slug}</span>
          <span className="rounded-full bg-gray-900/8 dark:bg-white/10
                           px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
            Admin
          </span>
        </div>
        <WorkspaceNav slug={slug} current="settings" showSettings />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-6 py-6">
        <RenameForm workspaceName={workspaceName} slug={slug} />
        <LabelCatalog slug={slug} labels={initialLabels} />
        <DeleteWorkspace slug={slug} />
      </main>
    </div>
  );
}

function RenameForm({ workspaceName, slug }: { workspaceName: string; slug: string }) {
  const router = useRouter();
  const [name, setName] = useState(workspaceName);
  const [nextSlug, setNextSlug] = useState(slug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/workspaces/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: nextSlug.trim() }),
      });
      const body = (await res.json()) as {
        workspace?: { slug: string; name: string };
        error?: string;
      };
      if (!res.ok || !body.workspace) {
        throw new Error(body.error ?? "Could not update the workspace.");
      }
      setSaved(true);
      if (body.workspace.slug !== slug) {
        router.push(`/${body.workspace.slug}/settings`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the workspace.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Workspace</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        The slug is the URL. Changing it moves the board to the new address.
      </p>
      <form onSubmit={save} className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            maxLength={64}
            className="glass-input mt-1 w-full"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Slug</span>
          <input
            value={nextSlug}
            onChange={(event) => setNextSlug(event.target.value)}
            required
            minLength={3}
            maxLength={48}
            pattern="[a-z0-9-]+"
            className="glass-input mt-1 w-full"
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        {saved ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Saved.</p>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          className="btn-primary !px-3 !py-2"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </section>
  );
}

function LabelCatalog({ slug, labels: initialLabels }: { slug: string; labels: Label[] }) {
  const [labels, setLabels] = useState(initialLabels);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState(COLORS[5]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createLabel(event: FormEvent) {
    event.preventDefault();
    if (busy || name.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${slug}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color }),
      });
      const body = (await res.json()) as { label?: Label; error?: string };
      if (!res.ok || !body.label) throw new Error(body.error ?? "Could not add that label.");
      setLabels((current) =>
        [...current, body.label!].sort((a, b) => a.name.localeCompare(b.name))
      );
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that label.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(label: Label) {
    setEditingId(label.id);
    setDraftName(label.name);
    setDraftColor(label.color);
    setConfirmId(null);
    setError(null);
  }

  async function saveEdit(labelId: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${slug}/labels/${labelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draftName.trim(), color: draftColor }),
      });
      const body = (await res.json()) as { label?: Label; error?: string };
      if (!res.ok || !body.label) throw new Error(body.error ?? "Could not update that label.");
      const saved = body.label;
      setLabels((current) =>
        current
          .map((item) => (item.id === saved.id ? saved : item))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update that label.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(labelId: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${slug}/labels/${labelId}`, { method: "DELETE" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not delete that label.");
      setLabels((current) => current.filter((item) => item.id !== labelId));
      setConfirmId(null);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete that label.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Labels</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Shared tags for this workspace. Deleting one removes it from every ticket.
      </p>

      {labels.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400 dark:text-gray-600">No labels yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-black/[0.05] dark:divide-white/[0.05]">
          {labels.map((label) => (
            <li key={label.id} className="flex flex-wrap items-center gap-3 py-3">
              {editingId === label.id ? (
                <>
                  <input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    maxLength={40}
                    className="glass-input min-w-40 flex-1"
                  />
                  <ColorSwatches value={draftColor} onChange={setDraftColor} />
                  <button
                    type="button"
                    disabled={busy || draftName.trim().length === 0}
                    onClick={() => void saveEdit(label.id)}
                    className="text-sm font-medium text-gray-900 dark:text-gray-100
                               disabled:text-gray-300 dark:disabled:text-gray-600 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setEditingId(null)}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="inline-flex min-w-0 flex-1 items-center gap-2 text-sm text-gray-900 dark:text-gray-100">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: label.color }}
                      aria-hidden
                    />
                    {label.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(label)}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Edit
                  </button>
                  {confirmId === label.id ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(label.id)}
                        className="text-sm font-medium text-red-700 dark:text-red-400
                                   disabled:text-red-300 dark:disabled:text-red-800 transition-colors"
                      >
                        {busy ? "Deleting…" : "Delete"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmId(null)}
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmId(label.id);
                        setError(null);
                      }}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={createLabel} className="mt-4 space-y-2 border-t border-black/[0.05] dark:border-white/[0.05] pt-4">
        <label className="block">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">New label</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            placeholder="bug"
            className="glass-input mt-1 w-full"
          />
        </label>
        <ColorSwatches value={color} onChange={setColor} />
        <button
          type="submit"
          disabled={busy || name.trim().length === 0}
          className="btn-primary !px-3 !py-1.5"
        >
          {busy ? "Saving…" : "Add label"}
        </button>
      </form>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </section>
  );
}

function ColorSwatches({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Label color">
      {COLORS.map((swatch) => (
        <button
          key={swatch}
          type="button"
          aria-label={swatch}
          aria-pressed={value === swatch}
          onClick={() => onChange(swatch)}
          className={`h-5 w-5 rounded-full transition-all duration-150 ${
            value === swatch
              ? "ring-2 ring-gray-900 dark:ring-white ring-offset-2 dark:ring-offset-zinc-900 scale-110"
              : "hover:scale-110"
          }`}
          style={{ backgroundColor: swatch }}
        />
      ))}
    </div>
  );
}

function DeleteWorkspace({ slug }: { slug: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(event: FormEvent) {
    event.preventDefault();
    if (deleting || confirm !== slug) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not delete this workspace.");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this workspace.");
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-red-200/70 dark:border-red-900/40
                        bg-red-50/50 dark:bg-red-950/20 p-5">
      <h2 className="text-sm font-semibold text-red-800 dark:text-red-400">Delete workspace</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        This removes every ticket, comment, label, and member. User accounts stay. This cannot be undone.
      </p>
      <form onSubmit={remove} className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Type <code className="font-mono">{slug}</code> to confirm
          </span>
          <input
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="off"
            className="glass-input mt-1 w-full"
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={deleting || confirm !== slug}
          className="rounded-lg bg-red-700 dark:bg-red-800 px-3 py-2 text-sm font-medium text-white
                     hover:bg-red-800 dark:hover:bg-red-700
                     disabled:cursor-not-allowed disabled:bg-red-200 dark:disabled:bg-red-950/50
                     dark:disabled:text-red-800 transition-colors"
        >
          {deleting ? "Deleting…" : "Delete workspace"}
        </button>
      </form>
    </section>
  );
}
