import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiDataSource } from "@/components/kanban/api-data-source";

function respond(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(() => respond(status, body));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createApiDataSource", () => {
  it("PATCHes a ticket and unwraps { ticket }", async () => {
    const fetchMock = stubFetch(200, { ticket: { id: "t1", status: "DONE" } });
    const api = createApiDataSource("acme");

    const ticket = await api.updateTicket("t1", { status: "DONE" });

    expect(ticket).toMatchObject({ id: "t1", status: "DONE" });
    expect(fetchMock).toHaveBeenCalledWith("/api/tickets/t1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE" }),
    });
  });

  it("creates a ticket under the workspace slug", async () => {
    const fetchMock = stubFetch(201, { ticket: { id: "t2" } });
    const api = createApiDataSource("acme");

    await api.createTicket({
      title: "x",
      description: "",
      status: "OPEN",
      priority: "LOW",
      assigneeId: null,
    });

    expect(fetchMock.mock.calls[0]).toEqual([
      "/api/workspaces/acme/tickets",
      expect.objectContaining({ method: "POST" }),
    ]);
  });

  it("surfaces the server's error message", async () => {
    stubFetch(403, { error: "Only the assignee or an admin can change the status of this ticket." });
    const api = createApiDataSource("acme");
    await expect(api.updateTicket("t1", { status: "DONE" })).rejects.toThrow(
      "Only the assignee or an admin can change the status of this ticket."
    );
  });

  it("falls back to the status code when the body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("boom", { status: 502 }))));
    const api = createApiDataSource("acme");
    await expect(api.deleteTicket("t1")).rejects.toThrow("Request failed (502).");
  });

  it("flattens the members response to id and name", async () => {
    stubFetch(200, {
      members: [{ id: "m1", role: "ADMIN", user: { id: "u1", name: "Ada", email: "a@x.io" } }],
    });
    const api = createApiDataSource("acme");
    await expect(api.listMembers()).resolves.toEqual([{ id: "u1", name: "Ada" }]);
  });

  it("sends comment text as { body } to the right URL", async () => {
    const fetchMock = stubFetch(201, { comment: { id: "c1", body: "hi" } });
    const api = createApiDataSource("acme");

    await api.postComment("t1", "hi");
    await api.editComment("t1", "c1", "edited");

    expect(fetchMock.mock.calls[0]).toEqual([
      "/api/tickets/t1/comments",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ body: "hi" }) }),
    ]);
    expect(fetchMock.mock.calls[1]).toEqual([
      "/api/tickets/t1/comments/c1",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ body: "edited" }) }),
    ]);
  });
});
