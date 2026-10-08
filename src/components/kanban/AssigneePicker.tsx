"use client";

/**
 * Assignee combobox for one workspace.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

type Member = {
  user: { id: string; name: string };
};

type Option = { id: string; name: string };

export function AssigneePicker({
  slug,
  value,
  onChange,
}: {
  slug: string;
  value: string;
  onChange: (userId: string) => void;
}) {
  const listId = useId();
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const edited = useRef(false);

  const selectedName = members.find((member) => member.user.id === value)?.user.name ?? "";

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/workspaces/${slug}/members`)
      .then(async (res) => {
        const body = (await res.json()) as { members?: Member[]; error?: string };
        if (!res.ok) throw new Error(body.error ?? "Could not load members");
        if (!cancelled) setMembers(body.members ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load members");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (edited.current) return;
    setQuery(selectedName);
  }, [selectedName]);

  const filtering = query.trim() !== selectedName;
  const needle = query.trim().toLowerCase();
  const options: Option[] = [
    ...(!filtering || "unassigned".includes(needle) ? [{ id: "", name: "Unassigned" }] : []),
    ...members
      .filter((member) => !filtering || member.user.name.toLowerCase().includes(needle))
      .map((member) => ({ id: member.user.id, name: member.user.name })),
  ];

  function choose(option: Option) {
    edited.current = false;
    onChange(option.id);
    setQuery(option.id ? option.name : "");
    setOpen(false);
    setHighlight(0);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (!open) return;
      event.stopPropagation();
      edited.current = false;
      setOpen(false);
      setQuery(selectedName);
      setHighlight(0);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (options.length === 0) return;
      setHighlight((current) => {
        const next = event.key === "ArrowDown" ? current + 1 : current - 1;
        return (next + options.length) % options.length;
      });
      return;
    }

    if (event.key === "Enter" && open) {
      event.preventDefault();
      const option = options[highlight];
      if (option) choose(option);
    }
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        edited.current = false;
        setOpen(false);
        setQuery(selectedName);
        setHighlight(0);
      }}
    >
      <label className="block">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Assignee</span>
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={query}
          placeholder="Unassigned"
          onChange={(event) => {
            edited.current = true;
            setQuery(event.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="glass-input mt-1 w-full"
        />
      </label>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl
                     border border-black/[0.08] dark:border-white/[0.08]
                     bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl
                     py-1 shadow-lg dark:shadow-black/40"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400 dark:text-gray-600">
              No members match
            </li>
          ) : (
            options.map((option, index) => (
              <li key={option.id || "unassigned"} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={option.id === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                  className={`block w-full px-3 py-1.5 text-left text-sm transition-colors ${
                    index === highlight
                      ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-gray-100"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  {option.name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}

      {error ? (
        <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : null}
    </div>
  );
}
