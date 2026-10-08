/**
 * src/app/invite/accept/page.tsx
 *
 * Route: GET /invite/accept?token=<jwt>
 *
 * This is a Server Component — it runs on the server, which means:
 *   - We can call verifyInviteToken() and prisma directly (no API hop needed)
 *   - We can use redirect() from next/navigation to send the user to the workspace
 *   - The JWT secret never touches the client
 *
 * Happy path:
 *   1. User clicks invite link → lands here
 *   2. Must be signed in (middleware redirects to /sign-in if not, then back here)
 *   3. Verify the JWT (signature + expiry)
 *   4. Create the Membership (idempotent — if they're already a member, do nothing)
 *   5. Redirect to the workspace
 *
 * Error path:
 *   - Expired token  → show "invite expired" message
 *   - Invalid token  → show "invalid invite" message
 *   - Already member → still redirect to workspace (idempotent is correct)
 */

import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import prisma from "@/lib/prisma";
import { inviteEmailMatches, verifyInviteToken } from "@/lib/invite";
import { Prisma } from "@prisma/client";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function InviteAcceptPage({ searchParams }: Props) {
  const { token } = await searchParams;

  // ── No token in URL ─────────────────────────────────────────────────────
  if (!token) {
    return <InviteError message="This invite link is missing a token. Ask your admin to resend the invite." />;
  }

  // ── Must be signed in ───────────────────────────────────────────────────
  // (Middleware already redirects to /sign-in — this is a belt-and-suspenders check)
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/invite/accept?token=${token}`);
  }
  const userId = session.user.id;

  // ── Verify JWT ──────────────────────────────────────────────────────────
  let workspaceId: string;
  let slug: string;
  let role: Awaited<ReturnType<typeof verifyInviteToken>>["role"];
  let email: string | undefined;

  try {
    ({ workspaceId, slug, role, email } = await verifyInviteToken(token));
  } catch {
    // jose throws on expired or tampered tokens
    return <InviteError message="This invite link has expired or is invalid. Ask your admin for a new one." />;
  }

  if (!inviteEmailMatches(email, session.user.email)) {
    return (
      <WrongAccount
        invited={email ?? "another address"}
        current={session.user.email ?? "an account with no email"}
        token={token}
      />
    );
  }

  // ── Create Membership (idempotent) ──────────────────────────────────────
  // We use upsert so clicking the same invite link twice doesn't throw.
  // The @@unique([userId, workspaceId]) constraint is the "conflict target".
  try {
    await prisma.membership.upsert({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
      create: { userId, workspaceId, role },
      // If they're already a member, do nothing (keep existing role)
      update: {},
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      // Workspace was deleted after the invite was issued
      return <InviteError message="This workspace no longer exists." />;
    }
    console.error("[/invite/accept]", err);
    return <InviteError message="Something went wrong. Please try again." />;
  }

  // ── Redirect to workspace ───────────────────────────────────────────────
  redirect(`/${slug}`);
}

// ─── Error UI ─────────────────────────────────────────────────────────────────

function WrongAccount({
  invited,
  current,
  token,
}: {
  invited: string;
  current: string;
  token: string;
}) {
  const returnTo = `/invite/accept?token=${encodeURIComponent(token)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Wrong account</h2>
        <p className="text-sm text-gray-500">
          This invite was sent to {invited}. You are signed in as {current}.
        </p>
        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signOut({ redirectTo: returnTo });
          }}
        >
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Sign out and switch account
          </button>
        </form>
      </div>
    </div>
  );
}

function InviteError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Invite Error</h2>
        <p className="text-sm text-gray-500">{message}</p>
        <a
          href="/"
          className="mt-6 inline-block text-sm text-indigo-600 hover:text-indigo-500 font-medium"
        >
          ← Back to home
        </a>
      </div>
    </div>
  );
}
