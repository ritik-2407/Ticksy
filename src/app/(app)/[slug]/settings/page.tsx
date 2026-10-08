/**
 * /[slug]/settings — rename, labels, and delete.
 *
 * Any member can open the URL. Only an admin sees the forms. The API
 * checks the role again, so hiding the form is not the security boundary.
 */

import { WorkspaceSettings } from "@/components/settings/WorkspaceSettings";
import { auth } from "@/auth";
import { requireMembership } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/${slug}/settings`);
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

  if (role !== "ADMIN") {
    return (
      <Status
        title="Admins only"
        body="Workspace name, labels, and deletion are limited to admins."
      />
    );
  }

  const [workspace, labels] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, slug: true },
    }),
    prisma.label.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
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
    <WorkspaceSettings
      workspaceName={workspace.name}
      slug={workspace.slug}
      labels={labels}
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
