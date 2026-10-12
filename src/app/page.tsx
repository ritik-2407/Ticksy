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
import { LandingPage } from "@/components/landing/LandingPage";

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

// Orange saturation ladder — lightest → full accent as work progresses
const BAR_COLOR: Record<TicketStatus, string> = {
  OPEN:        "bg-orange-200    dark:bg-orange-900/40",
  IN_PROGRESS: "bg-orange-300    dark:bg-orange-700/60",
  IN_REVIEW:   "bg-orange-400    dark:bg-orange-600/80",
  DONE:        "bg-orange-600    dark:bg-orange-500",
};

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) {
    return <LandingPage />;
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
    <div className="min-h-screen bg-[#faf7f2] dark:bg-zinc-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Background blobs — same aesthetic as the landing page */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="landing-blob absolute -top-48 -left-24 h-[560px] w-[560px] rounded-full bg-orange-200/30 dark:bg-orange-900/15 blur-3xl" style={{ animationDelay: "0s" }} />
        <div className="landing-blob absolute -top-24 right-0 h-[400px] w-[400px] rounded-full bg-amber-200/25 dark:bg-amber-900/10 blur-3xl" style={{ animationDelay: "2s" }} />
        <div className="landing-blob absolute bottom-0 left-1/2 h-[400px] w-[500px] -translate-x-1/2 rounded-full bg-orange-100/20 dark:bg-orange-950/15 blur-3xl" style={{ animationDelay: "4s" }} />
      </div>

      <AppHeader name={name} email={session.user.email} image={session.user.image} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Personalised greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            Hey,{" "}
            <span className="landing-gradient-text">
              {name.split(" ")[0]}
            </span>
          </h1>
          <p className="mt-1 text-sm text-stone-400 dark:text-stone-600">
            {memberships.length === 0
              ? "Create your first workspace to get started."
              : `${memberships.length} workspace${memberships.length !== 1 ? "s" : ""} · ${ticketTotal} ticket${ticketTotal !== 1 ? "s" : ""}`}
          </p>
        </div>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Workspaces" value={memberships.length} />
          <Stat label="Tickets" value={ticketTotal} />
          <Stat label="Still open" value={ticketTotal - done} />
          <Stat label="Done" value={done} />
        </section>

        {ticketTotal > 0 ? (
          <p className="mt-2.5 text-xs text-stone-400 dark:text-stone-600">
            {done} of {ticketTotal} done
            {" · "}
            {PRIORITIES.map((item) =>
              `${priorityTotals[item.priority]} ${item.title.toLowerCase()}`
            ).join(" · ")}
          </p>
        ) : null}

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-3">
            {memberships.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 dark:border-white/10
                              bg-[#faf7f2]/60 dark:bg-white/[0.02] px-6 py-12 text-center">
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
                      <span className="rounded-full bg-orange-500/10 dark:bg-orange-400/10
                                       px-2.5 py-1 text-xs font-medium text-orange-700 dark:text-orange-400">
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

