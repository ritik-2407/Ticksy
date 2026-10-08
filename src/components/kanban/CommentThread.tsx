"use client";

/**
 * Append-only comment thread for one ticket.
 */

import { useEffect, useState, type FormEvent } from "react";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; image: string | null };
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function CommentThread({
  ticketId,
  currentUserId,
  onPosted,
}: {
  ticketId: string;
  currentUserId: string;
  onPosted: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/tickets/${ticketId}/comments`)
      .then(async (res) => {
        const body = (await res.json()) as { comments?: Comment[]; error?: string };
        if (!res.ok) throw new Error(body.error ?? "Could not load comments");
        if (!cancelled) setComments(body.comments ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load comments");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  async function post(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || posting) return;

    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const payload = (await res.json()) as { comment?: Comment; error?: string };
      if (!res.ok || !payload.comment) {
        throw new Error(payload.error ?? "Could not post this comment.");
      }
      setComments((current) => [...current, payload.comment as Comment]);
      setDraft("");
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post this comment.");
    } finally {
      setPosting(false);
    }
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id);
    setEditBody(comment.body);
    setError(null);
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingId || savingEdit) return;
    const body = editBody.trim();
    if (!body) {
      setError("Comment cannot be empty.");
      return;
    }

    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const payload = (await res.json()) as { comment?: Comment; error?: string };
      if (!res.ok || !payload.comment) {
        throw new Error(payload.error ?? "Could not save this comment.");
      }
      const saved = payload.comment;
      setComments((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this comment.");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <section
      className="mt-6 border-t border-black/[0.06] dark:border-white/[0.06] pt-4"
      aria-label="Comments"
    >
      <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">Comments</h3>

      {loading ? (
        <p className="mt-3 text-sm text-gray-400 dark:text-gray-600">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400 dark:text-gray-600">No comments yet.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-2">
              {comment.author.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={comment.author.image}
                  alt=""
                  className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-gray-100 dark:bg-zinc-800"
                />
              ) : (
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full
                                 bg-gray-200 dark:bg-zinc-700
                                 text-[10px] font-medium text-gray-700 dark:text-gray-300">
                  {initials(comment.author.name)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {comment.author.name}
                  </span>
                  {" · "}
                  <time dateTime={comment.createdAt}>{formatWhen(comment.createdAt)}</time>
                </p>
                {editingId === comment.id ? (
                  <form onSubmit={saveEdit} className="mt-1">
                    <label className="block">
                      <span className="sr-only">Edit comment</span>
                      <textarea
                        value={editBody}
                        onChange={(event) => setEditBody(event.target.value)}
                        rows={3}
                        maxLength={10_000}
                        className="glass-input w-full"
                      />
                    </label>
                    {error ? (
                      <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {error}
                      </p>
                    ) : null}
                    <div className="mt-2 flex gap-2">
                      <button
                        type="submit"
                        disabled={savingEdit || editBody.trim().length === 0}
                        className="btn-primary !px-3 !py-1.5"
                      >
                        {savingEdit ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={savingEdit}
                        className="btn-ghost"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">
                      {comment.body}
                    </p>
                    {comment.author.id === currentUserId ? (
                      <button
                        type="button"
                        onClick={() => startEdit(comment)}
                        className="mt-1 text-xs text-gray-500 dark:text-gray-400
                                   hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                      >
                        Edit
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={post} className="mt-4">
        <label className="block">
          <span className="sr-only">Write a comment</span>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            maxLength={10_000}
            placeholder="Write a comment…"
            className="glass-input w-full"
          />
        </label>
        {error && editingId === null ? (
          <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={posting || draft.trim().length === 0}
          className="btn-primary mt-2 !px-3 !py-1.5"
        >
          {posting ? "Posting…" : "Comment"}
        </button>
      </form>
    </section>
  );
}
