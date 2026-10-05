/**
 * /api/workspaces/[slug]/labels
 *
 * GET  — list labels in this workspace. Any member can call this.
 * POST — create a label. ADMIN only.
 *
 * A label is a workspace tag ("bug", "feature"), not a ticket field.
 * Tickets attach to these rows later through the TicketLabels relation.
 * Creating the label and attaching it are separate steps: this route
 * only owns the workspace's catalog.
 *
 * WHY workspaceId comes from the guard, never the body:
 *   requireMembership / requireAdmin already proved the caller belongs
 *   to the slug in the URL. A workspaceId in the JSON would let someone
 *   file a label into a workspace they do not administer.
 *
 * WHY POST is admin-only:
 *   Labels are shared vocabulary. If every member can add one, the
 *   catalog turns into duplicates ("bug", "Bug", "bugs") and the
 *   board stops meaning the same thing to everyone.
 *
 * Request body (POST):
 *   { "name": "bug", "color": "#ef4444" }
 *   color is optional and defaults to #6b7280.
 *
 * Responses:
 *   200  { labels }            — GET
 *   201  { label }             — POST
 *   400  { error, issues }
 *   401  { error }
 *   403  { error }             — not a member, or not an admin on POST
 *   409  { error }             — this workspace already has that name
 *   500  { error }
 */

import { auth } from "@/auth";
import { requireAdmin, requireMembership } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const CreateLabelSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(40, "Name must be at most 40 characters"),
  color: z
    .string()
    .regex(HEX_COLOR, "Color must be a hex code like #ef4444")
    .default("#6b7280"),
});

const labelSelect = {
  id: true,
  name: true,
  color: true,
} satisfies Prisma.LabelSelect;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();

  let workspaceId: string;
  try {
    const { slug } = await params;
    ({ workspaceId } = await requireMembership(slug, session?.user?.id));
  } catch (res) {
    return res as Response;
  }

  try {
    const labels = await prisma.label.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
      select: labelSelect,
    });

    return Response.json({ labels });
  } catch (err) {
    console.error("[GET /api/workspaces/[slug]/labels]", err);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(
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
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = CreateLabelSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, color } = parsed.data;

  // The unique index is case-sensitive, so "Bug" and "bug" would both land.
  // Reject the near-duplicate before insert. The index still stops two
  // identical names that race past this read.
  const existing = await prisma.label.findFirst({
    where: {
      workspaceId,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (existing) {
    return Response.json(
      { error: `A label named "${name}" already exists in this workspace.` },
      { status: 409 }
    );
  }

  try {
    const label = await prisma.label.create({
      data: { name, color, workspaceId },
      select: labelSelect,
    });

    return Response.json({ label }, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return Response.json(
        { error: `A label named "${name}" already exists in this workspace.` },
        { status: 409 }
      );
    }

    console.error("[POST /api/workspaces/[slug]/labels]", err);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
