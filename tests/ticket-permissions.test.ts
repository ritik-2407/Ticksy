/**
 * The ticket edit policy, as a table.
 *
 * Pure functions, so no mocks and no database. Each case names the caller
 * (admin, the assignee, another member), whether the ticket is owned, and the
 * field being changed.
 */

import { describe, expect, it } from "vitest";
import {
  assertCanEditTicket,
  changedRestrictedFields,
  checkTicketEdit,
  getTicketPermissions,
  type TicketState,
} from "@/lib/ticket-permissions";

const ME = "user-me";
const OTHER = "user-other";

const owned: TicketState = { assigneeId: OTHER, status: "OPEN", priority: "MEDIUM" };
const ownedByMe: TicketState = { assigneeId: ME, status: "OPEN", priority: "MEDIUM" };
const unowned: TicketState = { assigneeId: null, status: "OPEN", priority: "MEDIUM" };

describe("getTicketPermissions", () => {
  it("lets an admin change everything, owned or not", () => {
    for (const assigneeId of [null, OTHER, ME]) {
      expect(getTicketPermissions({ role: "ADMIN", userId: ME, assigneeId })).toEqual({
        canChangeStatus: true,
        canChangePriority: true,
        canChangeAssignee: true,
      });
    }
  });

  it("lets the assignee change everything on their own ticket", () => {
    expect(getTicketPermissions({ role: "MEMBER", userId: ME, assigneeId: ME })).toEqual({
      canChangeStatus: true,
      canChangePriority: true,
      canChangeAssignee: true,
    });
  });

  it("locks status, priority and assignee for a member on someone else's ticket", () => {
    expect(getTicketPermissions({ role: "MEMBER", userId: ME, assigneeId: OTHER })).toEqual({
      canChangeStatus: false,
      canChangePriority: false,
      canChangeAssignee: false,
    });
  });

  it("opens status and assignee, but not priority, on an unowned ticket", () => {
    expect(getTicketPermissions({ role: "MEMBER", userId: ME, assigneeId: null })).toEqual({
      canChangeStatus: true,
      canChangePriority: false,
      canChangeAssignee: true,
    });
  });
});

describe("changedRestrictedFields", () => {
  it("ignores fields that were not sent", () => {
    expect(changedRestrictedFields(owned, {})).toEqual({
      status: false,
      priority: false,
      assignee: false,
    });
  });

  it("ignores fields resent with their current value (the drawer sends everything)", () => {
    expect(
      changedRestrictedFields(owned, {
        status: "OPEN",
        priority: "MEDIUM",
        assigneeId: OTHER,
      })
    ).toEqual({ status: false, priority: false, assignee: false });
  });

  it("treats null as a real value: unassigning an owned ticket is a change", () => {
    expect(changedRestrictedFields(owned, { assigneeId: null }).assignee).toBe(true);
  });

  it("does not count null on an already unowned ticket as a change", () => {
    expect(changedRestrictedFields(unowned, { assigneeId: null }).assignee).toBe(false);
  });
});

describe("checkTicketEdit: another member on an owned ticket", () => {
  const caller = { role: "MEMBER" as const, userId: ME, current: owned };

  it("cannot change status", () => {
    expect(checkTicketEdit({ ...caller, changes: { status: "DONE" } }).ok).toBe(false);
  });

  it("cannot change priority", () => {
    expect(checkTicketEdit({ ...caller, changes: { priority: "CRITICAL" } }).ok).toBe(false);
  });

  it("cannot reassign to someone else", () => {
    expect(checkTicketEdit({ ...caller, changes: { assigneeId: "user-third" } }).ok).toBe(false);
  });

  it("cannot take the ticket for themselves", () => {
    expect(checkTicketEdit({ ...caller, changes: { assigneeId: ME } }).ok).toBe(false);
  });

  it("cannot unassign it", () => {
    expect(checkTicketEdit({ ...caller, changes: { assigneeId: null } }).ok).toBe(false);
  });

  it("can still save when nothing restricted changed", () => {
    expect(
      checkTicketEdit({
        ...caller,
        changes: { status: "OPEN", priority: "MEDIUM", assigneeId: OTHER },
      }).ok
    ).toBe(true);
  });

  it("gives a message the UI can show", () => {
    const result = checkTicketEdit({ ...caller, changes: { status: "DONE" } });
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("assignee or an admin"),
    });
  });
});

describe("checkTicketEdit: member on an unowned ticket", () => {
  const caller = { role: "MEMBER" as const, userId: ME, current: unowned };

  it("can move it", () => {
    expect(checkTicketEdit({ ...caller, changes: { status: "IN_PROGRESS" } }).ok).toBe(true);
  });

  it("can assign it to themselves", () => {
    expect(checkTicketEdit({ ...caller, changes: { assigneeId: ME } }).ok).toBe(true);
  });

  it("can assign it to someone else", () => {
    expect(checkTicketEdit({ ...caller, changes: { assigneeId: OTHER } }).ok).toBe(true);
  });

  it("cannot change priority", () => {
    expect(checkTicketEdit({ ...caller, changes: { priority: "HIGH" } }).ok).toBe(false);
  });
});

describe("checkTicketEdit: the assignee", () => {
  const caller = { role: "MEMBER" as const, userId: ME, current: ownedByMe };

  it("can change status, priority, and hand the ticket on", () => {
    expect(
      checkTicketEdit({
        ...caller,
        changes: { status: "DONE", priority: "LOW", assigneeId: OTHER },
      }).ok
    ).toBe(true);
  });

  it("can unassign themselves", () => {
    expect(checkTicketEdit({ ...caller, changes: { assigneeId: null } }).ok).toBe(true);
  });
});

describe("checkTicketEdit: an admin", () => {
  it("can change anything on anyone's ticket", () => {
    for (const current of [owned, ownedByMe, unowned]) {
      expect(
        checkTicketEdit({
          role: "ADMIN",
          userId: ME,
          current,
          changes: { status: "DONE", priority: "CRITICAL", assigneeId: "user-third" },
        }).ok
      ).toBe(true);
    }
  });
});

describe("assertCanEditTicket", () => {
  it("throws a 403 Response when the edit is not allowed", () => {
    let thrown: unknown;
    try {
      assertCanEditTicket({
        role: "MEMBER",
        userId: ME,
        current: owned,
        changes: { status: "DONE" },
      });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(403);
  });

  it("returns quietly when the edit is allowed", () => {
    expect(() =>
      assertCanEditTicket({
        role: "ADMIN",
        userId: ME,
        current: owned,
        changes: { status: "DONE" },
      })
    ).not.toThrow();
  });
});
