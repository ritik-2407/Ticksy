"use client";

/**
 * The public demo: the real Board running on an in-memory store.
 *
 * Nothing is sent to the server. Every change lives in this tab and is gone
 * on refresh. The banner says so, lets the visitor switch between Admin and
 * Member (the permission model is the product's most distinctive feature),
 * reset the sandbox, and sign in to keep real work.
 */

import Link from "next/link";
import { useState } from "react";
import { Board } from "@/components/kanban/Board";
import { DEMO_WORKSPACE } from "@/lib/demo/demo-data";
import { DEMO_USER, createDemoStore } from "@/lib/demo/demo-store";
import type { Role } from "@prisma/client";

export function DemoBoard() {
  // Bumping this key throws away the session and builds a fresh seeded store.
  const [session, setSession] = useState(0);
  return <DemoSession key={session} onReset={() => setSession((n) => n + 1)} />;
}

function DemoSession({ onReset }: { onReset: () => void }) {
  const [{ store, initialTickets }] = useState(() => {
    const created = createDemoStore();
    return { store: created, initialTickets: created.listTickets() };
  });
  const [role, setRole] = useState<Role>("ADMIN");

  function changeRole(next: Role) {
    store.setRole(next);
    setRole(next);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2
                   border-b border-amber-600/15 dark:border-amber-400/15
                   bg-amber-500/[0.07] dark:bg-amber-400/[0.05] px-6 py-2.5"
      >
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <span className="font-semibold text-gray-900 dark:text-gray-100">Demo mode.</span>{" "}
          Drag cards, open tickets, comment. Changes stay in this tab and reset when you refresh.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="View the demo as"
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
          >
            <span>View as</span>
            <span className="inline-flex rounded-lg border border-black/[0.08] dark:border-white/10 p-0.5">
              {(["ADMIN", "MEMBER"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={role === option}
                  onClick={() => changeRole(option)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    role === option
                      ? "gold-surface"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  {option === "ADMIN" ? "Admin" : "Member"}
                </button>
              ))}
            </span>
          </div>

          <button type="button" onClick={onReset} className="btn-ghost">
            Reset
          </button>
          
        </div>
      </div>

      <Board
        workspaceName={DEMO_WORKSPACE.name}
        slug={DEMO_WORKSPACE.slug}
        role={role}
        currentUserId={DEMO_USER.id}
        members={store.members}
        tickets={initialTickets}
        dataSource={store}
      />
    </div>
  );
}
