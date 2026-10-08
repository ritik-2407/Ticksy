"use client";

/**
 * Creates a workspace through POST /api/workspaces, then opens its board.
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type FieldErrors = {
  name?: string[];
  slug?: string[];
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      });
      const body = (await res.json()) as {
        workspace?: { slug: string };
        error?: string;
        issues?: FieldErrors;
      };

      if (!res.ok || !body.workspace) {
        setFieldErrors(body.issues ?? {});
        setError(body.error ?? "Could not create that workspace.");
        return;
      }

      router.push(`/${body.workspace.slug}`);
      router.refresh();
    } catch {
      setError("Could not create that workspace.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="glass rounded-2xl p-5"
    >
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">New workspace</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        You become the admin. The slug is the board URL.
      </p>

      <label className="mt-4 block">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Name</span>
        <input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Acme Corp"
          required
          minLength={2}
          maxLength={64}
          className="glass-input mt-1 w-full"
        />
        {fieldErrors.name?.[0] ? (
          <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
            {fieldErrors.name[0]}
          </span>
        ) : null}
      </label>

      <label className="mt-3 block">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Slug</span>
        <input
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
          placeholder="acme-corp"
          required
          minLength={3}
          maxLength={48}
          pattern="[a-z0-9-]+"
          className="glass-input mt-1 w-full"
        />
        <span className="mt-1 block text-xs text-gray-400 dark:text-gray-600">
          /{slug || "your-slug"}
        </span>
        {fieldErrors.slug?.[0] ? (
          <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
            {fieldErrors.slug[0]}
          </span>
        ) : null}
      </label>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="btn-primary mt-4 w-full"
      >
        {saving ? "Creating…" : "Create workspace"}
      </button>
    </form>
  );
}
