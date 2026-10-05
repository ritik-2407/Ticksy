/**
 * POST /api/workspaces
 *
 * Creates a new workspace and makes the caller its first ADMIN — atomically.
 *
 * WHY a transaction?
 *   Creating the Workspace and the Membership are two separate DB writes.
 *   If the server crashes between them, you'd end up with an orphan workspace
 *   with zero members — no one could ever manage it. The transaction ensures
 *   both writes succeed together or neither does (all-or-nothing).
 *
 * WHY validate with Zod?
 *   `req.json()` gives us `unknown` — we have no guarantee the client sent
 *   the shape we expect. Zod parses and validates in one step, and gives us
 *   typed output + clean error messages if validation fails.
 *
 * Slug rules (enforced in schema):
 *   - Lowercase letters, numbers, hyphens only: /^[a-z0-9-]+$/
 *   - 3–48 characters
 *   - Unique across all workspaces (@@unique on the model)
 *
 * Request body:
 *   { "name": "Acme Corp", "slug": "acme-corp" }
 *
 * Responses:
 *   201  { workspace }
 *   400  { error, issues }   — Zod validation failed
 *   401  { error }           — not signed in
 *   409  { error }           — slug already taken
 *   500  { error }           — unexpected DB error
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// ─── Validation schema ───────────────────────────────────────────────────────

const CreateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(64, "Name must be at most 64 characters")
    .trim(),

  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(48, "Slug must be at most 48 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug may only contain lowercase letters, numbers, and hyphens"
    )
    .trim(),
});

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // ── Auth check ──────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json(
      { error: "Unauthorized — you must be signed in." },
      { status: 401 }
    );
  }
  const userId = session.user.id;

  // ── Parse + validate body ───────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = CreateWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid input.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { name, slug } = parsed.data;

  // ── Atomic write: Workspace + Membership ────────────────────────────────
  // prisma.$transaction runs both writes in a single DB transaction.
  // If the second write fails (e.g. userId doesn't exist), the first is rolled back.
  try {
    const workspace = await prisma.$transaction(async (tx) => {
      // 1. Create the workspace
      const ws = await tx.workspace.create({
        data: { name, slug },
      });

      // 2. Make the caller the first ADMIN of that workspace
      await tx.membership.create({
        data: {
          userId,
          workspaceId: ws.id,
          role: "ADMIN",
        },
      });

      return ws;
    });

    return Response.json({ workspace }, { status: 201 });
  } catch (err) {
    // Prisma throws a P2002 "Unique constraint failed" when the slug is taken.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return Response.json(
        { error: `The slug "${slug}" is already taken. Please choose another.` },
        { status: 409 }
      );
    }

    console.error("[POST /api/workspaces]", err);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
