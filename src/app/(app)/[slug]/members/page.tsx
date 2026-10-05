/**
 * /[slug]/members — people in this workspace.
 *
 * Same read path as the board: requireMembership, then Prisma. The API
 * list exists for the assignee picker. This page does not call it.
 */

import { MembersScreen } from "@/components/members/MembersScreen";
import { auth } from "@/auth";
import { requireMembership } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/${slug}/members`);
  }

  let workspaceId: string;
  let role: Awaited<ReturnType<typeof requireMembership>>["role"];
  let userId: string;
  try {
    ({ workspaceId, role, userId } = await requireMembership(slug, session.user.id));
  } catch {
    return (
      <Status
        title="Workspace unavailable"
        body={`There is no workspace “${slug}”, or your account is not a member of it.`}
      />
    );
  }

  const [workspace, members] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, slug: true },
    }),
    prisma.membership.findMany({
      where: { workspaceId },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
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
    <MembersScreen
      workspaceName={workspace.name}
      slug={workspace.slug}
      role={role}
      currentUserId={userId}
      members={members.map((member) => ({
        id: member.id,
        role: member.role,
        joinedLabel: member.createdAt.toLocaleDateString("en", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        user: member.user,
      }))}
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
