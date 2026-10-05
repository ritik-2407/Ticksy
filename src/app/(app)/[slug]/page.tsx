/**
 * /[slug] — the workspace board.
 *
 * Example: /acme-corp
 *
 * This is a Server Component. It reads the database directly instead of
 * calling GET /api/workspaces/[slug]/tickets. The API exists for the client
 * (drag-and-drop in the next step, and anything outside this Next.js app).
 * A server render that fetches its own API would pay for an extra HTTP hop
 * and would have to forward the session cookie by hand. The query here is
 * the same one the API uses: workspaceId from the guard, ticketSelect, newest
 * update first inside each status.
 *
 * requireMembership throws a Response. In a page we catch it and render,
 * because a thrown Response is an API habit, not a page.
 */

import { Board } from "@/components/kanban/Board";
import { auth } from "@/auth";
import { requireMembership } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { ticketSelect } from "@/lib/ticket";
import { redirect } from "next/navigation";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  // Middleware only checks that a session cookie exists. A missing or
  // expired session is caught here, on the Node runtime, where auth() can
  // read the database.
  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/${slug}`);
  }

  let workspaceId: string;
  let role: Awaited<ReturnType<typeof requireMembership>>["role"];
  try {
    ({ workspaceId, role } = await requireMembership(slug, session.user.id));
  } catch {
    return (
      <Status
        title="Workspace unavailable"
        body={`There is no workspace “${slug}”, or your account is not a member of it.`}
      />
    );
  }

  const [workspace, tickets] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, slug: true },
    }),
    prisma.ticket.findMany({
      where: { workspaceId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      select: ticketSelect,
    }),
  ]);

  if (!workspace) {
    return (
      <Status
        title="Workspace unavailable"
        body={`There is no workspace “${slug}”, or your account is not a member of it.`}
      />
    );
  }

  return (
    <Board
      workspaceName={workspace.name}
      slug={workspace.slug}
      role={role}
      currentUserId={session.user.id}
      tickets={tickets}
    />
  );
}

function Status({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">{body}</p>
      <a href="/" className="mt-6 text-sm font-medium text-gray-900 underline">
        Back to workspaces
      </a>
    </main>
  );
}
