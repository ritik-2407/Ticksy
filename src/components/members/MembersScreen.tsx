"use client";

/**
 * People in one workspace.
 *
 * Any member can see the list. Only an admin sees Invite and Remove.
 * Invite calls POST /api/workspaces/[slug]/invites and shows the link.
 * The API does not email it. Remove calls DELETE on the membership row.
 *
 * Removing yourself sends you back to the workspace list. Removing the
 * last admin is refused here and again by the API.
 */

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceNav } from "@/components/shell/WorkspaceNav";
import type { Role } from "@prisma/client";

export type MemberRow = {
  id: string;
  role: Role;
  joinedLabel: string;
  user: { id: string; name: string; email: string; image: string | null };
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function MembersScreen({
  workspaceName,
  slug,
  role,
  currentUserId,
  members: initialMembers,
}: {
  workspaceName: string;
  slug: string;
  role: Role;
  currentUserId: string;
  members: MemberRow[];
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [inviting, setInviting] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = role === "ADMIN";
  const adminCount = members.filter((member) => member.role === "ADMIN").length;

  async function remove(member: MemberRow) {
    if (removingId) return;
    setRemovingId(member.id);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${slug}/members/${member.id}`, {
        method: "DELETE",
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not remove this member.");
      if (member.user.id === currentUserId) {
        router.push("/");
        return;
      }
      setMembers((current) => current.filter((item) => item.id !== member.id));
      setConfirmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove this member.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-base font-semibold text-gray-900">{workspaceName}</h1>
            <span className="text-sm text-gray-400">/{slug}</span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              {isAdmin ? "Admin" : "Member"}
            </span>
          </div>
          <WorkspaceNav slug={slug} current="members" />
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => {
              setInviting(true);
              setError(null);
            }}
            className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Invite
          </button>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-6">
        <p className="text-sm text-gray-500">
          {members.length} {members.length === 1 ? "person" : "people"} in this workspace.
          {isAdmin
            ? " Invite sends a link. It is not emailed."
            : " An admin can invite people and remove members."}
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        <ul className="mt-4 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {members.map((member) => {
            const lastAdmin = member.role === "ADMIN" && adminCount <= 1;
            const isYou = member.user.id === currentUserId;
            return (
              <li key={member.id} className="flex items-center gap-3 px-4 py-3">
                {member.user.image ? (
                  // Google avatars. next/image needs a remotePatterns allow-list we do not have yet.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.user.image}
                    alt=""
                    className="h-9 w-9 rounded-full bg-gray-100"
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-700">
                    {initials(member.user.name)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {member.user.name}
                    {isYou ? <span className="font-normal text-gray-400"> · you</span> : null}
                  </p>
                  <p className="truncate text-xs text-gray-500">{member.user.email}</p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-medium text-gray-600">
                    {member.role === "ADMIN" ? "Admin" : "Member"}
                  </p>
                  <p className="text-xs text-gray-400">Joined {member.joinedLabel}</p>
                </div>
                {isAdmin ? (
                  lastAdmin ? (
                    <span className="text-xs text-gray-400">Last admin</span>
                  ) : confirmId === member.id ? (
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void remove(member)}
                        disabled={removingId === member.id}
                        className="text-sm font-medium text-red-700 disabled:text-red-300"
                      >
                        {removingId === member.id ? "Removing…" : isYou ? "Leave" : "Remove"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        disabled={removingId === member.id}
                        className="text-sm text-gray-500 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmId(member.id);
                        setError(null);
                      }}
                      className="text-sm text-gray-500 hover:text-red-700"
                    >
                      {isYou ? "Leave" : "Remove"}
                    </button>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
      </main>

      {inviting ? (
        <InviteDialog
          slug={slug}
          onClose={() => setInviting(false)}
        />
      ) : null}
    </div>
  );
}

function InviteDialog({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [inviteRole, setInviteRole] = useState<Role>("MEMBER");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [issuedRole, setIssuedRole] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !creating) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [creating, onClose]);

  async function createInvite(event: FormEvent) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch(`/api/workspaces/${slug}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: inviteRole }),
      });
      const body = (await res.json()) as { inviteUrl?: string; error?: string };
      if (!res.ok || !body.inviteUrl) {
        throw new Error(body.error ?? "Could not create an invite link.");
      }
      setInviteUrl(body.inviteUrl);
      setIssuedRole(inviteRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create an invite link.");
    } finally {
      setCreating(false);
    }
  }

  async function copy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setError("Could not copy the link. Select it and copy it yourself.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close invite"
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (!creating) onClose();
        }}
      />
      <form
        onSubmit={createInvite}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
        className="relative z-10 w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="invite-title" className="text-sm font-semibold text-gray-900">
            Invite
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        <p className="mt-2 text-sm text-gray-500">
          The link works for 48 hours. Anyone with it joins as the role you pick. It is not emailed.
        </p>

        <label className="mt-4 block">
          <span className="text-xs font-medium text-gray-500">Role</span>
          <select
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as Role)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>

        {inviteUrl ? (
          <div className="mt-4">
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Invite link</span>
              <input
                readOnly
                value={inviteUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <p className="mt-2 text-xs text-gray-500">
              This link joins as {issuedRole === "ADMIN" ? "an admin" : "a member"}.
            </p>
            <button
              type="button"
              onClick={() => void copy()}
              className="mt-2 text-sm font-medium text-gray-900 underline"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={creating}
          className="mt-5 w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {creating ? "Creating…" : inviteUrl ? "Create another link" : "Create invite link"}
        </button>
      </form>
    </div>
  );
}
