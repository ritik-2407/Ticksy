/**
 * / — landing when signed out, workspace dashboard when signed in.
 */

import { AppHeader } from "@/components/shell/AppHeader";
import { CreateWorkspaceForm } from "@/components/dashboard/CreateWorkspaceForm";
import { BOARD_COLUMNS } from "@/components/kanban/columns";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Priority, TicketStatus } from "@prisma/client";
import { PRIORITIES } from "@/components/kanban/columns";
import Link from "next/link";

const EMPTY_COUNTS: Record<TicketStatus, number> = {
  OPEN: 0,
  IN_PROGRESS: 0,
  IN_REVIEW: 0,
  DONE: 0,
};

const EMPTY_PRIORITY: Record<Priority, number> = {
  LOW: 0,
  MEDIUM: 0,
  HIGH: 0,
  CRITICAL: 0,
};

const BAR_COLOR: Record<TicketStatus, string> = {
  OPEN: "bg-gray-300 dark:bg-zinc-600",
  IN_PROGRESS: "bg-blue-400 dark:bg-blue-500",
  IN_REVIEW: "bg-amber-400 dark:bg-amber-500",
  DONE: "bg-emerald-500 dark:bg-emerald-500",
};

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) {
    return <Landing />;
  }

  const name = session.user.name?.trim() || "You";
  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          _count: { select: { members: true } },
        },
      },
    },
  });

  const workspaceIds = memberships.map((membership) => membership.workspace.id);
  const [grouped, groupedPriority] =
    workspaceIds.length === 0
      ? [[], []]
      : await Promise.all([
          prisma.ticket.groupBy({
            by: ["workspaceId", "status"],
            where: { workspaceId: { in: workspaceIds } },
            _count: { _all: true },
          }),
          prisma.ticket.groupBy({
            by: ["workspaceId", "priority"],
            where: { workspaceId: { in: workspaceIds } },
            _count: { _all: true },
          }),
        ] as const);

  const countsByWorkspace = new Map<string, Record<TicketStatus, number>>();
  const totals: Record<TicketStatus, number> = { ...EMPTY_COUNTS };
  for (const row of grouped) {
    const counts = countsByWorkspace.get(row.workspaceId) ?? { ...EMPTY_COUNTS };
    counts[row.status] = row._count._all;
    countsByWorkspace.set(row.workspaceId, counts);
    totals[row.status] += row._count._all;
  }

  const priorityByWorkspace = new Map<string, Record<Priority, number>>();
  const priorityTotals: Record<Priority, number> = { ...EMPTY_PRIORITY };
  for (const row of groupedPriority) {
    const counts = priorityByWorkspace.get(row.workspaceId) ?? { ...EMPTY_PRIORITY };
    counts[row.priority] = row._count._all;
    priorityByWorkspace.set(row.workspaceId, counts);
    priorityTotals[row.priority] += row._count._all;
  }

  const ticketTotal = BOARD_COLUMNS.reduce((sum, column) => sum + totals[column.status], 0);
  const done = totals.DONE;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <AppHeader name={name} email={session.user.email} image={session.user.image} />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Workspaces
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Boards you belong to. Open one to see its tickets.
        </p>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Workspaces" value={memberships.length} />
          <Stat label="Tickets" value={ticketTotal} />
          <Stat label="Still open" value={ticketTotal - done} />
          <Stat label="Done" value={done} />
        </section>

        {ticketTotal > 0 ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {done} of {ticketTotal} tickets are done.
            {" · "}
            {PRIORITIES.map((item) =>
              `${priorityTotals[item.priority]} ${item.title.toLowerCase()}`
            ).join(" · ")}
          </p>
        ) : null}

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-3">
            {memberships.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10
                              bg-white/50 dark:bg-white/[0.02] px-6 py-12 text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  No workspaces yet
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Use New workspace. You will be its admin, and the board starts empty.
                </p>
              </div>
            ) : (
              memberships.map((membership) => {
                const workspace = membership.workspace;
                const counts = countsByWorkspace.get(workspace.id) ?? EMPTY_COUNTS;
                const priorities = priorityByWorkspace.get(workspace.id) ?? EMPTY_PRIORITY;
                const total = BOARD_COLUMNS.reduce(
                  (sum, column) => sum + counts[column.status],
                  0
                );

                return (
                  <Link
                    key={workspace.id}
                    href={`/${workspace.slug}`}
                    className="glass block rounded-2xl p-5
                               hover:shadow-[0_6px_28px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_28px_rgba(0,0,0,0.5)]
                               transition-all duration-150"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {workspace.name}
                        </h2>
                        <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">
                          /{workspace.slug}
                        </p>
                      </div>
                      <span className="rounded-full bg-gray-900/8 dark:bg-white/10
                                       px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                        {membership.role === "ADMIN" ? "Admin" : "Member"}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4 flex h-1.5 overflow-hidden rounded-full
                                    bg-gray-100 dark:bg-white/5">
                      {total === 0
                        ? null
                        : BOARD_COLUMNS.map((column) =>
                            counts[column.status] === 0 ? null : (
                              <div
                                key={column.status}
                                className={BAR_COLOR[column.status]}
                                style={{ width: `${(counts[column.status] / total) * 100}%` }}
                                title={`${column.title}: ${counts[column.status]}`}
                              />
                            )
                          )}
                    </div>

                    <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
                      {BOARD_COLUMNS.map((column) => (
                        <div key={column.status}>
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                            {column.title}
                          </dt>
                          <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {counts[column.status]}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
                      {PRIORITIES.map((item) => (
                        <div key={item.priority}>
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                            {item.title}
                          </dt>
                          <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {priorities[item.priority]}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <p className="mt-3 text-xs text-gray-400 dark:text-gray-600">
                      {workspace._count.members}{" "}
                      {workspace._count.members === 1 ? "member" : "members"}
                      {" · "}
                      created{" "}
                      {workspace.createdAt.toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </Link>
                );
              })
            )}
          </section>

          <CreateWorkspaceForm />
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-2xl px-4 py-3">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
        {value}
      </p>
    </div>
  );
}

function Landing() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center
                     bg-white dark:bg-zinc-950 px-6 text-center
                     text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full
                        bg-blue-100/50 dark:bg-blue-950/40 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full
                        bg-violet-100/50 dark:bg-violet-950/40 blur-3xl" />
      </div>

      <p className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">
        Ticksy
      </p>
      <h1 className="mt-3 max-w-md text-4xl font-semibold tracking-tight">
        A board for the work your team is actually doing
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        Sign in, create a workspace, and file tickets onto a four-column board.
      </p>
      <Link
        href="/sign-in"
        className="btn-primary mt-8 inline-block !px-5 !py-2.5"
      >
        Sign in with Google
      </Link>
    </main>
  );
}
