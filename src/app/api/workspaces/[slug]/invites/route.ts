/**
 * POST /api/workspaces/[slug]/invites
 *
 * Generates an invite link for a workspace. Only ADMINs can create invites.
 *
 * WHY only ADMINs?
 *   Anyone with a MEMBER role being able to invite others would let a single
 *   compromised account recruit unlimited people into the workspace.
 *   Gating it on ADMIN keeps membership growth controlled.
 *
 * Request body:
 *   { "role": "MEMBER" }          ← what role the invitee will get on acceptance
 *   { "role": "ADMIN" }           ← invite someone as a co-admin
 *   (role is optional, defaults to "MEMBER")
 *
 * Response:
 *   { inviteUrl: "http://localhost:3000/invite/accept?token=eyJ..." }
 *
 * NOTE on email delivery:
 *   This endpoint returns the URL — it does NOT send an email.
 *   Plug in Resend (https://resend.com) or Nodemailer here when you're ready.
 *   Pattern:
 *     await resend.emails.send({ to: email, subject: "...", html: `<a href="${inviteUrl}">Join</a>` })
 *
 * Responses:
 *   201  { inviteUrl }
 *   400  { error }   — invalid role
 *   401  { error }   — not signed in
 *   403  { error }   — not a member OR not an ADMIN
 *   500  { error }   — unexpected error
 */

import { auth } from "@/auth";
import { requireAdmin } from "@/lib/guard";
import { signInviteToken } from "@/lib/invite";
import { z } from "zod";
import { Role } from "@prisma/client";

// ─── Validation ──────────────────────────────────────────────────────────────

const InviteSchema = z.object({
  role: z.nativeEnum(Role).default(Role.MEMBER),
});

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const session = await auth();

  // ── Guard: must be ADMIN ──────────────────────────────────────────────────
  let workspaceId: string;
  let slug: string;
  try {
    ({ slug } = await params);
    ({ workspaceId } = await requireAdmin(slug, session?.user?.id));
  } catch (res) {
    return res as Response;
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {}; // body is optional — default role is MEMBER
  }

  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { role } = parsed.data;

  // ── Sign token + build URL ────────────────────────────────────────────────
  try {
    const token = await signInviteToken({ workspaceId, slug, role });

    // AUTH_URL is the app's base URL (http://localhost:3000 in dev)
    const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
    const inviteUrl = `${baseUrl}/invite/accept?token=${token}`;

    // TODO: send email here via Resend or Nodemailer
    // Example (Resend):
    //   await resend.emails.send({
    //     from: "Ticksy <noreply@ticksy.app>",
    //     to: recipientEmail,
    //     subject: `You've been invited to ${slug} on Ticksy`,
    //     html: `<a href="${inviteUrl}">Accept invite</a>`,
    //   })

    // Dev convenience: log the link so you can test without email setup
    if (process.env.NODE_ENV === "development") {
      console.log(`\n[DEV] Invite URL for workspace "${slug}":\n${inviteUrl}\n`);
    }

    return Response.json({ inviteUrl }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/workspaces/[slug]/invites]", err);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
