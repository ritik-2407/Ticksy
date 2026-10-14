/**
 * PATCH /api/tickets/[id] enforces the edit policy.
 *
 * tests/ticket-permissions.test.ts proves the rules. This file proves the
 * route actually applies them: the status code a caller gets, that a refused
 * request never reaches the write, and that a lost race returns 409 instead of
 * overwriting someone else's assignment.
 *
 * Prisma is stubbed. The real guards run on top of the stub.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
const ticketFindUnique = vi.fn();
const ticketFindFirst = vi.fn();
const membershipFindUnique = vi.fn();
const updateMany = vi.fn();
const update = vi.fn();

vi.mock("@/auth", () => ({ auth: () => auth() }));

vi.mock("@/lib/prisma", () => ({
  default: {
    ticket: {
      findUnique: (...args: unknown[]) => ticketFindUnique(...args),
      findFirst: (...args: unknown[]) => ticketFindFirst(...args),
    },
    membership: {
      findUnique: (...args: unknown[]) => membershipFindUnique(...args),
    },
    $transaction: (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        ticket: {
          updateMany: (...args: unknown[]) => updateMany(...args),
          update: (...args: unknown[]) => update(...args),
          findFirst: (...args: unknown[]) => ticketFindFirst(...args),
        },
      }),
  },
}));

import { PATCH } from "@/app/api/tickets/[id]/route";

// zod's cuid() only needs a leading "c" and enough characters.
const TICKET = "cticket000000000001";
const WS = "cworkspace0000000001";
const ME = "cuserme0000000000001";
const OTHER = "cuserother00000000001";
const THIRD = "cuserthird00000000001";

type Role = "ADMIN" | "MEMBER";

/**
 * Arranges one scenario: who is calling, and what the ticket looks like now.
 * `writeCount` is what updateMany reports. 0 simulates losing a race.
 */
function arrange({
  role,
  assigneeId,
  status = "OPEN",
  priority = "MEDIUM",
  writeCount = 1,
  stillExists = true,
}: {
  role: Role;
  assigneeId: string | null;
  status?: string;
  priority?: string;
  writeCount?: number;
  stillExists?: boolean;
}) {
  auth.mockResolvedValue({ user: { id: ME } });
  ticketFindUnique.mockResolvedValue({ id: TICKET, workspaceId: WS });

  // The caller has `role`. The other two users are plain members, so they
  // are valid assignees.
  membershipFindUnique.mockImplementation(
    async ({ where }: { where: { userId_workspaceId: { userId: string } } }) => {
      const userId = where.userId_workspaceId.userId;
      if (userId === ME) return { role, workspaceId: WS };
      if (userId === OTHER || userId === THIRD) return { role: "MEMBER", workspaceId: WS };
      return null;
    }
  );

  ticketFindFirst.mockImplementation(
    async ({ select }: { select: Record<string, unknown> }) => {
      // The permission read asks for the three restricted fields.
      if ("assigneeId" in select) return { assigneeId, status, priority };
      // The race check inside the transaction asks only for the id.
      if (Object.keys(select).length === 1 && "id" in select) {
        return stillExists ? { id: TICKET } : null;
      }
      // The final read returns the full card.
      return { id: TICKET, title: "t", assignee: null, labels: [] };
    }
  );

  updateMany.mockResolvedValue({ count: writeCount });
  update.mockResolvedValue({});
}

function patch(body: unknown) {
  return PATCH(
    new Request(`http://localhost/api/tickets/${TICKET}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: TICKET }) }
  );
}

beforeEach(() => {
  auth.mockReset();
  ticketFindUnique.mockReset();
  ticketFindFirst.mockReset();
  membershipFindUnique.mockReset();
  updateMany.mockReset();
  update.mockReset();
});

describe("PATCH /api/tickets/[id] — member on someone else's ticket", () => {
  beforeEach(() => arrange({ role: "MEMBER", assigneeId: OTHER }));

  it("403 when changing status, and nothing is written", async () => {
    const res = await patch({ status: "DONE" });
    expect(res.status).toBe(403);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("403 when changing priority", async () => {
    expect((await patch({ priority: "CRITICAL" })).status).toBe(403);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("403 when reassigning", async () => {
    expect((await patch({ assigneeId: THIRD })).status).toBe(403);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("403 when stealing the ticket", async () => {
    expect((await patch({ assigneeId: ME })).status).toBe(403);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("403 when unassigning", async () => {
    expect((await patch({ assigneeId: null })).status).toBe(403);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("403 when a restricted change is mixed in with a title edit", async () => {
    expect((await patch({ title: "New", status: "DONE" })).status).toBe(403);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("explains the refusal in the body", async () => {
    const body = (await (await patch({ status: "DONE" })).json()) as { error: string };
    expect(body.error).toMatch(/assignee or an admin/);
  });

  it("200 for a title edit: content is open to every member", async () => {
    const res = await patch({ title: "Better title" });
    expect(res.status).toBe(200);
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  it("200 when the drawer resends unchanged restricted fields with a title edit", async () => {
    const res = await patch({
      title: "Better title",
      status: "OPEN",
      priority: "MEDIUM",
      assigneeId: OTHER,
    });
    expect(res.status).toBe(200);
  });

  it("200 for labels only", async () => {
    // No labels table needed: an empty set clears labels.
    const res = await patch({ labelIds: [] });
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/tickets/[id] — member on an unowned ticket", () => {
  beforeEach(() => arrange({ role: "MEMBER", assigneeId: null }));

  it("200 when moving it", async () => {
    expect((await patch({ status: "IN_PROGRESS" })).status).toBe(200);
  });

  it("200 when taking it", async () => {
    expect((await patch({ assigneeId: ME })).status).toBe(200);
  });

  it("200 when assigning it to a colleague", async () => {
    expect((await patch({ assigneeId: OTHER })).status).toBe(200);
  });

  it("403 when changing priority", async () => {
    expect((await patch({ priority: "HIGH" })).status).toBe(403);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("400 when assigning to someone outside the workspace", async () => {
    const res = await patch({ assigneeId: "cstranger00000000001" });
    expect(res.status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/tickets/[id] — the assignee", () => {
  beforeEach(() => arrange({ role: "MEMBER", assigneeId: ME }));

  it("200 when changing status, priority and handing the ticket on", async () => {
    const res = await patch({ status: "DONE", priority: "LOW", assigneeId: OTHER });
    expect(res.status).toBe(200);
  });

  it("200 when unassigning themselves", async () => {
    expect((await patch({ assigneeId: null })).status).toBe(200);
  });
});

describe("PATCH /api/tickets/[id] — an admin", () => {
  it("200 for anything on someone else's ticket", async () => {
    arrange({ role: "ADMIN", assigneeId: OTHER });
    const res = await patch({ status: "DONE", priority: "CRITICAL", assigneeId: THIRD });
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/tickets/[id] — races", () => {
  it("409 when the assignee changed between the check and the write", async () => {
    // The ticket looked unowned when we checked. By the time we wrote, someone
    // else had taken it, so the pinned WHERE matched nothing.
    arrange({ role: "MEMBER", assigneeId: null, writeCount: 0, stillExists: true });
    const res = await patch({ assigneeId: ME });
    expect(res.status).toBe(409);
  });

  it("pins the assignee we checked against when a restricted field changes", async () => {
    arrange({ role: "MEMBER", assigneeId: null });
    await patch({ assigneeId: ME });
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TICKET, workspaceId: WS, assigneeId: null },
      })
    );
  });

  it("pins the current assignee for the assignee's own status change", async () => {
    arrange({ role: "MEMBER", assigneeId: ME });
    await patch({ status: "DONE" });
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TICKET, workspaceId: WS, assigneeId: ME },
      })
    );
  });

  it("does not pin the assignee for a title-only edit, so it never conflicts", async () => {
    arrange({ role: "MEMBER", assigneeId: OTHER });
    await patch({ title: "New" });
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TICKET, workspaceId: WS } })
    );
  });

  it("404, not 409, when the ticket was deleted under us", async () => {
    arrange({ role: "MEMBER", assigneeId: null, writeCount: 0, stillExists: false });
    expect((await patch({ assigneeId: ME })).status).toBe(404);
  });
});

describe("PATCH /api/tickets/[id] — access before policy", () => {
  it("401 with no session", async () => {
    arrange({ role: "MEMBER", assigneeId: null });
    auth.mockResolvedValue(null);
    expect((await patch({ title: "x" })).status).toBe(401);
  });

  it("404 for a ticket in a workspace the caller is not in", async () => {
    arrange({ role: "MEMBER", assigneeId: null });
    membershipFindUnique.mockResolvedValue(null);
    expect((await patch({ status: "DONE" })).status).toBe(404);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
