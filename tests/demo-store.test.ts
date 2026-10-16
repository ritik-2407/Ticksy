import { describe, expect, it } from "vitest";
import { DEMO_TICKETS } from "@/lib/demo/demo-data";
import { DEMO_USER, createDemoStore } from "@/lib/demo/demo-store";

const NOW = Date.parse("2026-10-16T12:00:00Z");

// Seed facts the tests rely on.
const TEAMMATES_TICKET = "demo-ticket-4"; // assigned to Maya, CRITICAL
const MY_TICKET = "demo-ticket-5"; // assigned to the visitor
const UNASSIGNED_TICKET = "demo-ticket-1";

describe("demo store: seed", () => {
  it("fills every column and returns tickets in board order", () => {
    const store = createDemoStore(NOW);
    const tickets = store.listTickets();
    expect(tickets).toHaveLength(DEMO_TICKETS.length);

    const statuses = tickets.map((ticket) => ticket.status);
    expect(new Set(statuses)).toEqual(new Set(["OPEN", "IN_PROGRESS", "IN_REVIEW", "DONE"]));

    const order = ["OPEN", "IN_PROGRESS", "IN_REVIEW", "DONE"];
    const ranks = statuses.map((status) => order.indexOf(status));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it("counts seed comments on the cards", () => {
    const store = createDemoStore(NOW);
    const ticket = store.listTickets().find((item) => item.id === TEAMMATES_TICKET);
    expect(ticket?._count.comments).toBe(2);
  });

  it("starts as an admin who is also a member", async () => {
    const store = createDemoStore(NOW);
    expect(store.members.map((member) => member.id)).toContain(DEMO_USER.id);
    await expect(store.updateTicket(TEAMMATES_TICKET, { status: "DONE" })).resolves.toMatchObject({
      status: "DONE",
    });
  });
});

describe("demo store: isolation", () => {
  it("does not let a returned ticket mutate the store", () => {
    const store = createDemoStore(NOW);
    const first = store.listTickets();
    first[0].title = "tampered";
    first[0].labels.push({ id: "x", name: "x", color: "#000" });
    expect(store.listTickets()[0].title).not.toBe("tampered");
    expect(store.listTickets()[0].labels.some((label) => label.id === "x")).toBe(false);
  });

  it("keeps two stores independent", async () => {
    const a = createDemoStore(NOW);
    const b = createDemoStore(NOW);
    await a.deleteTicket(UNASSIGNED_TICKET);
    expect(a.listTickets()).toHaveLength(DEMO_TICKETS.length - 1);
    expect(b.listTickets()).toHaveLength(DEMO_TICKETS.length);
  });
});

describe("demo store: permissions match the real policy", () => {
  it("lets a member move an unassigned ticket", async () => {
    const store = createDemoStore(NOW);
    store.setRole("MEMBER");
    await expect(store.updateTicket(UNASSIGNED_TICKET, { status: "IN_PROGRESS" })).resolves.toMatchObject({
      status: "IN_PROGRESS",
    });
  });

  it("lets a member move and re-prioritise their own ticket", async () => {
    const store = createDemoStore(NOW);
    store.setRole("MEMBER");
    await expect(
      store.updateTicket(MY_TICKET, { status: "IN_REVIEW", priority: "HIGH" })
    ).resolves.toMatchObject({ status: "IN_REVIEW", priority: "HIGH" });
  });

  it("stops a member moving, re-prioritising or reassigning a teammate's ticket", async () => {
    const store = createDemoStore(NOW);
    store.setRole("MEMBER");

    await expect(store.updateTicket(TEAMMATES_TICKET, { status: "DONE" })).rejects.toThrow(
      /Only the assignee or an admin/
    );
    await expect(store.updateTicket(TEAMMATES_TICKET, { priority: "LOW" })).rejects.toThrow(
      /Only the assignee or an admin/
    );
    await expect(
      store.updateTicket(TEAMMATES_TICKET, { assigneeId: DEMO_USER.id })
    ).rejects.toThrow(/Only the assignee or an admin/);

    const unchanged = store.listTickets().find((ticket) => ticket.id === TEAMMATES_TICKET);
    expect(unchanged).toMatchObject({ status: "IN_PROGRESS", priority: "CRITICAL" });
    expect(unchanged?.assignee?.name).toBe("Maya Chen");
  });

  it("still lets a member edit a teammate's title and labels", async () => {
    const store = createDemoStore(NOW);
    store.setRole("MEMBER");
    const saved = await store.updateTicket(TEAMMATES_TICKET, {
      title: "Safari login loop",
      labelIds: ["demo-label-docs"],
    });
    expect(saved.title).toBe("Safari login loop");
    expect(saved.labels.map((label) => label.id)).toEqual(["demo-label-docs"]);
  });

  it("applies a role switch immediately", async () => {
    const store = createDemoStore(NOW);
    store.setRole("MEMBER");
    await expect(store.updateTicket(TEAMMATES_TICKET, { status: "DONE" })).rejects.toThrow();
    store.setRole("ADMIN");
    await expect(store.updateTicket(TEAMMATES_TICKET, { status: "DONE" })).resolves.toBeDefined();
  });

  it("limits delete and label creation to admins", async () => {
    const store = createDemoStore(NOW);
    store.setRole("MEMBER");
    await expect(store.deleteTicket(UNASSIGNED_TICKET)).rejects.toThrow(/admin/);
    await expect(store.createLabel({ name: "perf", color: "#000000" })).rejects.toThrow(/admin/);

    store.setRole("ADMIN");
    await expect(store.createLabel({ name: "perf", color: "#000000" })).resolves.toMatchObject({
      name: "perf",
    });
    await expect(store.deleteTicket(UNASSIGNED_TICKET)).resolves.toBeUndefined();
  });
});

describe("demo store: validation", () => {
  it("rejects a blank or oversized title without changing the ticket", async () => {
    const store = createDemoStore(NOW);
    await expect(store.updateTicket(UNASSIGNED_TICKET, { title: "   " })).rejects.toThrow(/Title is required/);
    await expect(store.updateTicket(UNASSIGNED_TICKET, { title: "x".repeat(201) })).rejects.toThrow(/at most 200/);
    await expect(store.createTicket({
      title: " ",
      description: "",
      status: "OPEN",
      priority: "LOW",
      assigneeId: null,
    })).rejects.toThrow(/Title is required/);
  });

  it("rejects an empty patch, an unknown assignee and a foreign label", async () => {
    const store = createDemoStore(NOW);
    await expect(store.updateTicket(UNASSIGNED_TICKET, {})).rejects.toThrow(/at least one field/);
    await expect(store.updateTicket(UNASSIGNED_TICKET, { assigneeId: "nobody" })).rejects.toThrow(/member/);
    await expect(store.updateTicket(UNASSIGNED_TICKET, { labelIds: ["nope"] })).rejects.toThrow(/label/i);
  });

  it("applies nothing when one field of a patch is invalid", async () => {
    const store = createDemoStore(NOW);
    await expect(
      store.updateTicket(UNASSIGNED_TICKET, { title: "Renamed", assigneeId: "nobody" })
    ).rejects.toThrow();
    const ticket = store.listTickets().find((item) => item.id === UNASSIGNED_TICKET);
    expect(ticket?.title).not.toBe("Renamed");
  });

  it("trims text and refuses a duplicate label name regardless of case", async () => {
    const store = createDemoStore(NOW);
    const saved = await store.updateTicket(UNASSIGNED_TICKET, { title: "  Padded  " });
    expect(saved.title).toBe("Padded");
    await expect(store.createLabel({ name: "BUG", color: "#000000" })).rejects.toThrow(/already exists/);
  });
});

describe("demo store: tickets", () => {
  it("creates a ticket created by the visitor", async () => {
    const store = createDemoStore(NOW);
    const created = await store.createTicket({
      title: "Try the demo",
      description: "  hello ",
      status: "IN_REVIEW",
      priority: "HIGH",
      assigneeId: "demo-user-dev",
    });
    expect(created).toMatchObject({
      title: "Try the demo",
      description: "hello",
      status: "IN_REVIEW",
      createdBy: { id: DEMO_USER.id },
      assignee: { name: "Dev Patel" },
      _count: { comments: 0 },
    });
    expect(store.listTickets()).toHaveLength(DEMO_TICKETS.length + 1);
  });

  it("gives every created ticket a distinct id", async () => {
    const store = createDemoStore(NOW);
    const input = { title: "a", description: "", status: "OPEN", priority: "LOW", assigneeId: null } as const;
    const [one, two] = [await store.createTicket(input), await store.createTicket(input)];
    expect(one.id).not.toBe(two.id);
  });

  it("removes a deleted ticket together with its comments", async () => {
    const store = createDemoStore(NOW);
    await store.deleteTicket(TEAMMATES_TICKET);
    expect(store.listTickets().some((ticket) => ticket.id === TEAMMATES_TICKET)).toBe(false);
    await expect(store.listComments(TEAMMATES_TICKET)).rejects.toThrow(/not found/);
  });

  it("fails clearly for a ticket that does not exist", async () => {
    const store = createDemoStore(NOW);
    await expect(store.updateTicket("missing", { title: "x" })).rejects.toThrow(/not found/);
    await expect(store.deleteTicket("missing")).rejects.toThrow(/not found/);
  });

  it("moves an updated ticket to the front of its column", async () => {
    const store = createDemoStore(NOW);
    await store.updateTicket(UNASSIGNED_TICKET, { title: "Freshly touched" });
    const open = store.listTickets().filter((ticket) => ticket.status === "OPEN");
    expect(open[0].id).toBe(UNASSIGNED_TICKET);
  });
});

describe("demo store: comments", () => {
  it("lists comments oldest first with real timestamps", async () => {
    const store = createDemoStore(NOW);
    const thread = await store.listComments(TEAMMATES_TICKET);
    expect(thread.map((comment) => comment.id)).toEqual(["demo-comment-1", "demo-comment-2"]);
    expect(Date.parse(thread[0].createdAt)).toBeLessThan(Date.parse(thread[1].createdAt));
    expect(Date.parse(thread[1].createdAt)).toBeLessThanOrEqual(NOW);
  });

  it("posts as the visitor and bumps the card count", async () => {
    const store = createDemoStore(NOW);
    const posted = await store.postComment(UNASSIGNED_TICKET, "  On it.  ");
    expect(posted).toMatchObject({ body: "On it.", author: { id: DEMO_USER.id } });
    expect((await store.listComments(UNASSIGNED_TICKET)).map((c) => c.id)).toContain(posted.id);
    const card = store.listTickets().find((ticket) => ticket.id === UNASSIGNED_TICKET);
    expect(card?._count.comments).toBe(1);
  });

  it("rejects an empty comment", async () => {
    const store = createDemoStore(NOW);
    await expect(store.postComment(UNASSIGNED_TICKET, "   ")).rejects.toThrow(/empty/);
  });

  it("lets the visitor edit their own comment but not a teammate's", async () => {
    const store = createDemoStore(NOW);
    await expect(store.editComment(MY_TICKET, "demo-comment-3", "Updated")).resolves.toMatchObject({
      body: "Updated",
    });
    await expect(store.editComment(TEAMMATES_TICKET, "demo-comment-1", "Hijacked")).rejects.toThrow(
      /your own/
    );
    await expect(store.editComment(MY_TICKET, "demo-comment-1", "x")).rejects.toThrow(/not found/);
  });
});
