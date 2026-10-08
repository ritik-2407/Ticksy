/**
 * /api/workspaces/[slug]/labels/[labelId]
 *
 * PATCH  — rename a label or change its color. ADMIN only.
 * DELETE — remove it from the catalog and from every ticket. ADMIN only.
 *
 * The label is loaded with both id and workspaceId. A label that belongs
 * to another workspace returns 404, same as a missing id, so the response
 * does not reveal that the id exists somewhere else.
 *
 * Responses:
 *   200  { label }     — PATCH
 *   200  { ok: true }  — DELETE
 *   400  { error, issues }
 *   401  { error }
 *   403  { error }
 *   404  { error }
 *   409  { error }     — another label in this workspace already has that name
 *   500  { error }
 */

import { auth } from "@/auth";
import { requireAdmin } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const UpdateLabelSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(40, "Name must be at most 40 characters")
      .optional(),
    color: z.string().regex(HEX_COLOR, "Color must be a hex code like #ef4444").optional(),
  })
  .refine((value) => value.name !== undefined || value.color !== undefined, {
    message: "Provide a name or a color.",
  });

const labelSelect = {
  id: true,
  name: true,
  color: true,
} satisfies Prisma.LabelSelect;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; labelId: string }> }
) {
  const session = await auth();

  let workspaceId: string;
  let labelId: string;
  try {
    const resolved = await params;
    labelId = resolved.labelId;
    ({ workspaceId } = await requireAdmin(resolved.slug, session?.user?.id));
  } catch (res) {
    return res as Response;
  }

  const current = await prisma.label.findFirst({
    where: { id: labelId, workspaceId },
    select: { id: true },
  });
  if (!current) {
    return Response.json({ error: "Label not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = UpdateLabelSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  if (parsed.data.name) {
    const clash = await prisma.label.findFirst({
      where: {
        workspaceId,
        id: { not: labelId },
        name: { equals: parsed.data.name, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (clash) {
      return Response.json(
        { error: `A label named "${parsed.data.name}" already exists in this workspace.` },
        { status: 409 }
      );
    }
  }

  try {
    const label = await prisma.label.update({
      where: { id: labelId },
      data: parsed.data,
      select: labelSelect,
    });
    return Response.json({ label });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return Response.json(
        { error: `A label named "${parsed.data.name}" already exists in this workspace.` },
        { status: 409 }
      );
    }
    console.error("[PATCH /api/workspaces/[slug]/labels/[labelId]]", err);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; labelId: string }> }
) {
  const session = await auth();

  let workspaceId: string;
  let labelId: string;
  try {
    const resolved = await params;
    labelId = resolved.labelId;
    ({ workspaceId } = await requireAdmin(resolved.slug, session?.user?.id));
  } catch (res) {
    return res as Response;
  }

  const current = await prisma.label.findFirst({
    where: { id: labelId, workspaceId },
    select: { id: true },
  });
  if (!current) {
    return Response.json({ error: "Label not found." }, { status: 404 });
  }

  try {
    await prisma.label.delete({ where: { id: labelId } });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/workspaces/[slug]/labels/[labelId]]", err);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
