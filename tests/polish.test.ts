import { beforeEach, describe, expect, it } from "vitest";
import { filterTickets } from "@/components/kanban/columns";
import { safeCallbackUrl } from "@/lib/callback";
import { inviteEmailMatches, signInviteToken, verifyInviteToken } from "@/lib/invite";

describe("filterTickets", () => {
  const tickets = [
    { id: "a", priority: "HIGH" as const, assignee: { id: "ada" } },
    { id: "b", priority: "LOW" as const, assignee: null },
    { id: "c", priority: "HIGH" as const, assignee: null },
  ];

  it("returns every ticket when both filters are open", () => {
    expect(filterTickets(tickets, { priority: "ALL", assignee: "ALL" })).toEqual(tickets);
  });

  it("keeps one priority", () => {
    expect(filterTickets(tickets, { priority: "HIGH", assignee: "ALL" }).map((ticket) => ticket.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("keeps unassigned tickets", () => {
    expect(
      filterTickets(tickets, { priority: "ALL", assignee: "UNASSIGNED" }).map((ticket) => ticket.id)
    ).toEqual(["b", "c"]);
  });

  it("combines priority and assignee", () => {
    expect(
      filterTickets(tickets, { priority: "HIGH", assignee: "ada" }).map((ticket) => ticket.id)
    ).toEqual(["a"]);
  });
});

describe("safeCallbackUrl", () => {
  it("keeps a same-origin path, including an invite token", () => {
    expect(safeCallbackUrl("/invite/accept?token=abc")).toBe("/invite/accept?token=abc");
  });

  it("rejects off-site targets", () => {
    expect(safeCallbackUrl("https://evil.example")).toBe("/");
    expect(safeCallbackUrl("//evil.example")).toBe("/");
    expect(safeCallbackUrl(undefined)).toBe("/");
  });
});

describe("invite email", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret-test-secret-test-secret";
  });

  it("matches the invited address and ignores case", () => {
    expect(inviteEmailMatches("Ada@Acme.com", "ada@acme.com")).toBe(true);
    expect(inviteEmailMatches("ada@acme.com", "bob@acme.com")).toBe(false);
    expect(inviteEmailMatches("ada@acme.com", null)).toBe(false);
    expect(inviteEmailMatches(undefined, "ada@acme.com")).toBe(true);
  });

  it("stores the email on the token in lowercase", async () => {
    const token = await signInviteToken({
      workspaceId: "ws",
      slug: "acme",
      role: "MEMBER",
      email: "Ada@Acme.com",
    });
    await expect(verifyInviteToken(token)).resolves.toMatchObject({
      workspaceId: "ws",
      slug: "acme",
      role: "MEMBER",
      email: "ada@acme.com",
    });
  });
});
