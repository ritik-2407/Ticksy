/**
 * /api/workspaces/[slug]
 *
 * PATCH  — rename the workspace or change its slug. ADMIN only.
 * DELETE — delete the workspace and everything in it. ADMIN only.
 *
 * DELETE requires { "confirm": "<current slug>" }. A request with no body
 * cannot wipe a workspace by accident.
 *
 * Slug rules match POST /api/workspaces: lowercase, 3–48 characters.
 * Changing the slug changes the URL. Tickets, labels, and members stay;
 * they hang off the workspace id, not the slug.
 *
 * Deleting the workspace cascades to memberships, tickets, labels, and
 * comments. User accounts are left alone.
 *
 * Responses:
 *   200  { workspace }          — PATCH
 *   200  { ok: true }           — DELETE
 *   400  { error, issues }
 *   401  { error }
 *   403  { error }
 *   404  { error }
 *   409  { error }              — slug already taken
 *   500  { error }
 */

import { auth } from "@/auth";
import { requireAdmin } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const SlugSchema = z
  .string()
  .trim()
  .min(3, "Slug must be at least 3 characters")
  .max(48, "Slug must be at most 48 characters")
  .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens");

const UpdateWorkspaceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(64, "Name must be at most 64 characters")
      .optional(),
    slug: SlugSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.slug !== undefined, {
    message: "Provide a name or a slug.",
  });

const DeleteWorkspaceSchema = z.object({
  confirm: z.string(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();

  let workspaceId: string;
  try {
    const { slug } = await params;
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

  const parsed = UpdateWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: parsed.data,
      select: { id: true, name: true, slug: true },
    });
    return Response.json({ workspace });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return Response.json(
        { error: `The slug "${parsed.data.slug}" is already taken.` },
        { status: 409 }
      );
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return Response.json({ error: "Workspace not found." }, { status: 404 });
    }
    console.error("[PATCH /api/workspaces/[slug]]", err);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(
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
    return Response.json(
      { error: "Type the workspace slug to confirm deletion." },
      { status: 400 }
    );
  }

  const parsed = DeleteWorkspaceSchema.safeParse(body);
  if (!parsed.success || parsed.data.confirm !== slug) {
    return Response.json(
      { error: "Type the workspace slug exactly to confirm deletion." },
      { status: 400 }
    );
  }

  try {
    await prisma.workspace.delete({ where: { id: workspaceId } });
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return Response.json({ error: "Workspace not found." }, { status: 404 });
    }
    console.error("[DELETE /api/workspaces/[slug]]", err);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
