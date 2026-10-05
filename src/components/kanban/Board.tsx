"use client";

/**
 * Kanban board with drag-between-columns.
 *
 * The card moves in React state the moment you drop it. That is the
 * optimistic update: the UI does not wait for the server. Then we PATCH
 * /api/tickets/[id] with the new status. If that request fails, moveTicket
 * puts the card back and an error shows under the header.
 *
 * Dropping a card in its own column does nothing. There is no position
 * column in the database, so order inside a column is not saved.
 */

import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Column } from "@/components/kanban/Column";
import { DetailDrawer } from "@/components/kanban/DetailDrawer";
import { NewTicketDialog } from "@/components/kanban/NewTicketDialog";
import { TicketCard } from "@/components/kanban/TicketCard";
import { WorkspaceNav } from "@/components/shell/WorkspaceNav";
import { BOARD_COLUMNS, groupTickets, isBoardStatus, moveTicket } from "@/components/kanban/columns";
import type { TicketCard as Ticket } from "@/lib/ticket";
import type { Role } from "@prisma/client";

const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length > 0) return hits;
  return rectIntersection(args);
};

export function Board({
  workspaceName,
  slug,
  role,
  currentUserId,
  tickets: initialTickets,
}: {
  workspaceName: string;
  slug: string;
  role: Role;
  currentUserId: string;
  tickets: Ticket[];
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didDrag = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const groups = groupTickets(tickets);
  const activeTicket = tickets.find((ticket) => ticket.id === activeId) ?? null;
  const openTicket = tickets.find((ticket) => ticket.id === openTicketId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    didDrag.current = true;
    setActiveId(String(event.active.id));
    setError(null);
  }

  function clearDragFlag() {
    window.setTimeout(() => {
      didDrag.current = false;
    }, 0);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    clearDragFlag();

    const overId = event.over ? String(event.over.id) : null;
    if (!overId || !isBoardStatus(overId)) return;

    const ticketId = String(event.active.id);
    const ticket = tickets.find((item) => item.id === ticketId);
    if (!ticket || ticket.status === overId || pendingId === ticketId) return;

    const previousStatus = ticket.status;
    setTickets((current) => moveTicket(current, ticketId, overId));
    setPendingId(ticketId);

    void fetch(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: overId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("status update failed");
      })
      .catch(() => {
        setTickets((current) => moveTicket(current, ticketId, previousStatus));
        setError("Could not save that move. The ticket was put back.");
      })
      .finally(() => {
        setPendingId((current) => (current === ticketId ? null : current));
      });
  }

  function handleDragCancel() {
    setActiveId(null);
    clearDragFlag();
  }

  function applySavedTicket(saved: Ticket) {
    setTickets((current) => {
      const existing = current.find((item) => item.id === saved.id);
      if (!existing) return current;
      const merged = current.map((item) =>
        item.id === saved.id
          ? {
              ...item,
              title: saved.title,
              description: saved.description,
              priority: saved.priority,
              assignee: saved.assignee,
              labels: saved.labels,
              _count: saved._count,
            }
          : item
      );
      if (existing.status === saved.status) return merged;
      return moveTicket(merged, saved.id, saved.status);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-base font-semibold text-gray-900">{workspaceName}</h1>
            <span className="text-sm text-gray-400">/{slug}</span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              {role === "ADMIN" ? "Admin" : "Member"}
            </span>
          </div>
          <WorkspaceNav slug={slug} current="board" />
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          New ticket
        </button>
      </header>

      {error ? (
        <p
          role="alert"
          className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <main className="flex flex-1 gap-4 overflow-x-auto p-6">
          {BOARD_COLUMNS.map((column) => (
            <Column
              key={column.status}
              status={column.status}
              title={column.title}
              tickets={groups.get(column.status) ?? []}
              pendingId={pendingId}
              didDrag={didDrag}
              onOpen={setOpenTicketId}
            />
          ))}
        </main>

        <DragOverlay>
          {activeTicket ? (
            <div className="w-72">
              <TicketCard ticket={activeTicket} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {openTicket ? (
        <DetailDrawer
          key={openTicket.id}
          ticket={openTicket}
          slug={slug}
          role={role}
          currentUserId={currentUserId}
          onClose={() => setOpenTicketId(null)}
          onSaved={applySavedTicket}
          onDeleted={() => {
            setTickets((current) => current.filter((item) => item.id !== openTicket.id));
            setOpenTicketId(null);
          }}
          onCommented={() => {
            if (!openTicketId) return;
            setTickets((current) =>
              current.map((item) =>
                item.id === openTicketId
                  ? { ...item, _count: { comments: item._count.comments + 1 } }
                  : item
              )
            );
          }}
        />
      ) : null}

      {creating ? (
        <NewTicketDialog
          slug={slug}
          onClose={() => setCreating(false)}
          onCreated={(ticket) => {
            setTickets((current) => [ticket, ...current]);
            setCreating(false);
          }}
        />
      ) : null}
    </div>
  );
}
