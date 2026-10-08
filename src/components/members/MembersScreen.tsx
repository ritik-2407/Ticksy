"use client";

/**
 * People in one workspace with invite dialog.
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
      <header className="glass-header flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">{workspaceName}</h1>
            <span className="text-sm text-gray-400 dark:text-gray-500">/{slug}</span>
            <span className="rounded-full bg-gray-900/8 dark:bg-white/10
                             px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
              {isAdmin ? "Admin" : "Member"}
            </span>
          </div>
          <WorkspaceNav slug={slug} current="members" showSettings={isAdmin} />
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => {
              setInviting(true);
              setError(null);
            }}
            className="btn-primary"
          >
            Invite
          </button>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {members.length} {members.length === 1 ? "person" : "people"} in this workspace.
          {isAdmin
            ? " Invite is for one email address. The link lasts 48 hours."
            : " An admin can invite people and remove members."}
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 dark:border-red-900/50
                       bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400"
          >
            {error}
          </p>
        ) : null}

        <ul className="mt-4 divide-y divide-black/[0.05] dark:divide-white/[0.05]
                       overflow-hidden rounded-2xl
                       border border-black/[0.08] dark:border-white/[0.08]
                       bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl">
          {members.map((member) => {
            const lastAdmin = member.role === "ADMIN" && adminCount <= 1;
            const isYou = member.user.id === currentUserId;
            return (
              <li key={member.id} className="flex items-center gap-3 px-4 py-3
                                              hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                {member.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.user.image}
                    alt=""
                    className="h-9 w-9 rounded-full bg-gray-100 dark:bg-zinc-800"
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full
                                   bg-gray-200 dark:bg-zinc-700
                                   text-xs font-medium text-gray-700 dark:text-gray-300">
                    {initials(member.user.name)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {member.user.name}
                    {isYou ? (
                      <span className="font-normal text-gray-400 dark:text-gray-600"> · you</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {member.user.email}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {member.role === "ADMIN" ? "Admin" : "Member"}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-600">
                    Joined {member.joinedLabel}
                  </p>
                </div>
                {isAdmin ? (
                  lastAdmin ? (
                    <span className="text-xs text-gray-400 dark:text-gray-600">Last admin</span>
                  ) : confirmId === member.id ? (
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void remove(member)}
                        disabled={removingId === member.id}
                        className="text-sm font-medium text-red-700 dark:text-red-400
                                   disabled:text-red-300 dark:disabled:text-red-800 transition-colors"
                      >
                        {removingId === member.id ? "Removing…" : isYou ? "Leave" : "Remove"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        disabled={removingId === member.id}
                        className="text-sm text-gray-500 dark:text-gray-400
                                   hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
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
                      className="text-sm text-gray-500 dark:text-gray-400
                                 hover:text-red-700 dark:hover:text-red-400 transition-colors"
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
        <InviteDialog slug={slug} onClose={() => setInviting(false)} />
      ) : null}
    </div>
  );
}

function InviteDialog({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("MEMBER");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [emailed, setEmailed] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
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
        body: JSON.stringify({ email: email.trim(), role: inviteRole }),
      });
      const body = (await res.json()) as {
        inviteUrl?: string;
        emailed?: boolean;
        email?: string;
        error?: string;
      };
      if (!res.ok || !body.inviteUrl) {
        throw new Error(body.error ?? "Could not create an invite.");
      }
      setInviteUrl(body.inviteUrl);
      setEmailed(body.emailed === true);
      setSentTo(body.email ?? email.trim());
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
        className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px]"
        onClick={() => {
          if (!creating) onClose();
        }}
      />
      <form
        onSubmit={createInvite}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
        className="relative z-10 w-full max-w-md rounded-2xl
                   bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl
                   border border-black/[0.08] dark:border-white/[0.08]
                   shadow-[0_24px_64px_rgba(0,0,0,0.15)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.7)]
                   p-5"
      >
        <div className="flex items-center justify-between">
          <h2 id="invite-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Invite
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost">
            Close
          </button>
        </div>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          The link works for 48 hours and only for the address you enter.
        </p>

        <label className="mt-4 block">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</span>
          <input
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ada@acme.com"
            className="glass-input mt-1 w-full"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Role</span>
          <select
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as Role)}
            className="glass-input mt-1 w-full cursor-pointer"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>

        {inviteUrl ? (
          <div className="mt-4">
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Invite link</span>
              <input
                readOnly
                value={inviteUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="glass-input mt-1 w-full"
              />
            </label>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {emailed
                ? `Sent to ${sentTo}. `
                : `Nothing was emailed. Copy the link and send it to ${sentTo}. `}
              It joins as {issuedRole === "ADMIN" ? "an admin" : "a member"}.
            </p>
            <button
              type="button"
              onClick={() => void copy()}
              className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100 underline transition-opacity hover:opacity-70"
            >
              {copied ? "Copied ✓" : "Copy link"}
            </button>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={creating}
          className="btn-primary mt-5 w-full"
        >
          {creating ? "Sending…" : inviteUrl ? "Send another invite" : "Send invite"}
        </button>
      </form>
    </div>
  );
}
