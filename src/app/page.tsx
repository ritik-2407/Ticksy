/**
 * / — landing when signed out, workspace dashboard when signed in.
 *
 * The list is read from the database here, same reason as the board page:
 * a server render should not call its own HTTP API. Creating a workspace
 * still goes through POST /api/workspaces, from CreateWorkspaceForm.
 */

import { AppHeader } from "@/components/shell/AppHeader";
import { CreateWorkspaceForm } from "@/components/dashboard/CreateWorkspaceForm";
import { BOARD_COLUMNS } from "@/components/kanban/columns";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { TicketStatus } from "@prisma/client";
import Link from "next/link";

const EMPTY_COUNTS: Record<TicketStatus, number> = {
  OPEN: 0,
  IN_PROGRESS: 0,
  IN_REVIEW: 0,
  DONE: 0,
};

const BAR_COLOR: Record<TicketStatus, string> = {
  OPEN: "bg-gray-300",
  IN_PROGRESS: "bg-blue-400",
  IN_REVIEW: "bg-amber-400",
  DONE: "bg-emerald-500",
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
  const grouped =
    workspaceIds.length === 0
      ? []
      : await prisma.ticket.groupBy({
          by: ["workspaceId", "status"],
          where: { workspaceId: { in: workspaceIds } },
          _count: { _all: true },
        });

  const countsByWorkspace = new Map<string, Record<TicketStatus, number>>();
  const totals: Record<TicketStatus, number> = { ...EMPTY_COUNTS };
  for (const row of grouped) {
    const counts = countsByWorkspace.get(row.workspaceId) ?? { ...EMPTY_COUNTS };
    counts[row.status] = row._count._all;
    countsByWorkspace.set(row.workspaceId, counts);
    totals[row.status] += row._count._all;
  }

  const ticketTotal = BOARD_COLUMNS.reduce((sum, column) => sum + totals[column.status], 0);
  const done = totals.DONE;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <AppHeader name={name} email={session.user.email} image={session.user.image} />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
        <p className="mt-1 text-sm text-gray-500">
          Boards you belong to. Open one to see its tickets.
        </p>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Workspaces" value={memberships.length} />
          <Stat label="Tickets" value={ticketTotal} />
          <Stat label="Still open" value={ticketTotal - done} />
          <Stat label="Done" value={done} />
        </section>

        {ticketTotal > 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            {done} of {ticketTotal} tickets are done.
          </p>
        ) : null}

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-3">
            {memberships.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
                <p className="text-sm font-medium text-gray-900">No workspaces yet</p>
                <p className="mt-1 text-sm text-gray-500">
                  Use New workspace. You will be its admin, and the board starts empty.
                </p>
              </div>
            ) : (
              memberships.map((membership) => {
                const workspace = membership.workspace;
                const counts = countsByWorkspace.get(workspace.id) ?? EMPTY_COUNTS;
                const total = BOARD_COLUMNS.reduce(
                  (sum, column) => sum + counts[column.status],
                  0
                );

                return (
                  <Link
                    key={workspace.id}
                    href={`/${workspace.slug}`}
                    className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-gray-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-gray-900">{workspace.name}</h2>
                        <p className="mt-0.5 text-sm text-gray-400">/{workspace.slug}</p>
                      </div>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        {membership.role === "ADMIN" ? "Admin" : "Member"}
                      </span>
                    </div>

                    <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-gray-100">
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
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                            {column.title}
                          </dt>
                          <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                            {counts[column.status]}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <p className="mt-3 text-xs text-gray-400">
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
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{value}</p>
    </div>
  );
}

function Landing() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center text-gray-900">
      <p className="text-sm font-semibold tracking-tight">Ticksy</p>
      <h1 className="mt-3 max-w-md text-4xl font-semibold tracking-tight">
        A board for the work your team is actually doing
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-500">
        Sign in, create a workspace, and file tickets onto a four-column board.
      </p>
      <Link
        href="/sign-in"
        className="mt-8 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
      >
        Sign in with Google
      </Link>
    </main>
  );
}
