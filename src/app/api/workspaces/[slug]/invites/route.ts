/**
 * POST /api/workspaces/[slug]/invites
 *
 * Creates an invite for one email address. Only ADMINs can do this.
 *
 * The token carries that email. The accept page refuses a signed-in user
 * whose email does not match, so forwarding the link does not add a stranger.
 *
 * Request body:
 *   { "email": "ada@acme.com", "role": "MEMBER" }
 *   role is optional and defaults to MEMBER.
 *
 * When RESEND_API_KEY and RESEND_FROM are set, the link is emailed.
 * Otherwise the response still includes inviteUrl so the admin can copy it.
 *
 * Responses:
 *   201  { inviteUrl, emailed, email }
 *   400  { error, issues }
 *   401  { error }
 *   403  { error }
 *   409  { error }   — that email is already a member
 *   500  { error }
 */

import { auth } from "@/auth";
import { requireAdmin } from "@/lib/guard";
import { signInviteToken } from "@/lib/invite";
import { sendInviteEmail } from "@/lib/mail";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Role } from "@prisma/client";

const InviteSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(254)
    .transform((value) => value.toLowerCase()),
  role: z.nativeEnum(Role).default(Role.MEMBER),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();

  let workspaceId: string;
  let slug: string;
  try {
    ({ slug } = await params);
    ({ workspaceId } = await requireAdmin(slug, session?.user?.id));
  } catch (res) {
    return res as Response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { email, role } = parsed.data;

  const already = await prisma.membership.findFirst({
    where: {
      workspaceId,
      user: { email: { equals: email, mode: "insensitive" } },
    },
    select: { id: true },
  });

  if (already) {
    return Response.json(
      { error: `${email} is already a member of this workspace.` },
      { status: 409 }
    );
  }

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });
    if (!workspace) {
      return Response.json({ error: "Workspace not found." }, { status: 404 });
    }

    const token = await signInviteToken({ workspaceId, slug, role, email });
    const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const inviteUrl = `${baseUrl}/invite/accept?token=${token}`;

    const { sent } = await sendInviteEmail({
      to: email,
      workspaceName: workspace.name,
      role,
      inviteUrl,
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`\n[DEV] Invite for ${email} in "${slug}":\n${inviteUrl}\n`);
    }

    return Response.json({ inviteUrl, emailed: sent, email }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/workspaces/[slug]/invites]", err);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
