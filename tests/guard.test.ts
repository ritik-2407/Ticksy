/**
 * Proves the permission gates without a database.
 *
 * These functions are the only thing standing between a request and
 * another workspace's rows. The tests stub Prisma and check the status
 * code each situation must return:
 *   401  no session
 *   403  signed in, but not allowed (non-member on a slug, or member doing admin work)
 *   404  ticket is missing, or it lives in a workspace you are not in
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
const membershipFindFirst = vi.fn();
const membershipFindUnique = vi.fn();
const ticketFindUnique = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => auth(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    membership: {
      findFirst: (...args: unknown[]) => membershipFindFirst(...args),
      findUnique: (...args: unknown[]) => membershipFindUnique(...args),
    },
    ticket: {
      findUnique: (...args: unknown[]) => ticketFindUnique(...args),
    },
  },
}));

import {
  requireAdmin,
  requireMembership,
  requireTicket,
  requireTicketAdmin,
} from "@/lib/guard";

async function thrownStatus(run: () => Promise<unknown>): Promise<number> {
  try {
    await run();
  } catch (err) {
    if (err instanceof Response) return err.status;
    throw err;
  }
  throw new Error("expected the guard to throw");
}

beforeEach(() => {
  auth.mockReset();
  membershipFindFirst.mockReset();
  membershipFindUnique.mockReset();
  ticketFindUnique.mockReset();
});

describe("requireMembership", () => {
  it("returns 401 when there is no session", async () => {
    auth.mockResolvedValue(null);
    expect(await thrownStatus(() => requireMembership("acme"))).toBe(401);
    expect(membershipFindFirst).not.toHaveBeenCalled();
  });

  it("returns 403 when the user is not a member of that workspace", async () => {
    membershipFindFirst.mockResolvedValue(null);
    expect(await thrownStatus(() => requireMembership("acme", "user-1"))).toBe(403);
  });

  it("returns the workspace and role for a member", async () => {
    membershipFindFirst.mockResolvedValue({
      role: "MEMBER",
      workspaceId: "ws-acme",
    });
    await expect(requireMembership("acme", "user-1")).resolves.toEqual({
      userId: "user-1",
      workspaceId: "ws-acme",
      role: "MEMBER",
    });
  });
});

describe("requireAdmin", () => {
  it("returns 403 when a member tries an admin action", async () => {
    membershipFindFirst.mockResolvedValue({
      role: "MEMBER",
      workspaceId: "ws-acme",
    });
    expect(await thrownStatus(() => requireAdmin("acme", "user-1"))).toBe(403);
  });

  it("passes for an admin", async () => {
    membershipFindFirst.mockResolvedValue({
      role: "ADMIN",
      workspaceId: "ws-acme",
    });
    await expect(requireAdmin("acme", "user-1")).resolves.toMatchObject({
      role: "ADMIN",
      workspaceId: "ws-acme",
    });
  });
});

describe("requireTicket", () => {
  it("returns 404 when the ticket does not exist", async () => {
    ticketFindUnique.mockResolvedValue(null);
    expect(await thrownStatus(() => requireTicket("ticket-1", "user-1"))).toBe(404);
    expect(membershipFindUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when the ticket belongs to another workspace", async () => {
    ticketFindUnique.mockResolvedValue({ id: "ticket-1", workspaceId: "ws-nova" });
    membershipFindUnique.mockResolvedValue(null);
    expect(await thrownStatus(() => requireTicket("ticket-1", "user-1"))).toBe(404);
  });

  it("passes when the caller is a member of the ticket's workspace", async () => {
    ticketFindUnique.mockResolvedValue({ id: "ticket-1", workspaceId: "ws-acme" });
    membershipFindUnique.mockResolvedValue({
      role: "MEMBER",
      workspaceId: "ws-acme",
    });
    await expect(requireTicket("ticket-1", "user-1")).resolves.toEqual({
      userId: "user-1",
      workspaceId: "ws-acme",
      role: "MEMBER",
      ticketId: "ticket-1",
    });
  });
});

describe("requireTicketAdmin", () => {
  it("returns 403 when a member tries to delete", async () => {
    ticketFindUnique.mockResolvedValue({ id: "ticket-1", workspaceId: "ws-acme" });
    membershipFindUnique.mockResolvedValue({
      role: "MEMBER",
      workspaceId: "ws-acme",
    });
    expect(await thrownStatus(() => requireTicketAdmin("ticket-1", "user-1"))).toBe(403);
  });

  it("returns 404 for another workspace, not 403", async () => {
    ticketFindUnique.mockResolvedValue({ id: "ticket-1", workspaceId: "ws-nova" });
    membershipFindUnique.mockResolvedValue(null);
    expect(await thrownStatus(() => requireTicketAdmin("ticket-1", "user-1"))).toBe(404);
  });

  it("passes for an admin of that workspace", async () => {
    ticketFindUnique.mockResolvedValue({ id: "ticket-1", workspaceId: "ws-acme" });
    membershipFindUnique.mockResolvedValue({
      role: "ADMIN",
      workspaceId: "ws-acme",
    });
    await expect(requireTicketAdmin("ticket-1", "user-1")).resolves.toMatchObject({
      role: "ADMIN",
      ticketId: "ticket-1",
    });
  });
});
