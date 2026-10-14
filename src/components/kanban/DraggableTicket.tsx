"use client";

import { useDraggable } from "@dnd-kit/core";
import { TicketCard } from "@/components/kanban/TicketCard";
import type { TicketCard as Ticket } from "@/lib/ticket";

export function DraggableTicket({
  ticket,
  disabled,
  locked,
  didDrag,
  onOpen,
}: {
  ticket: Ticket;
  /** A save for this ticket is in flight. */
  disabled: boolean;
  /** The caller may not change this ticket's status, so it cannot be dragged. */
  locked: boolean;
  didDrag: { current: boolean };
  onOpen: (ticketId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
    disabled: disabled || locked,
  });

  return (
    <div
      ref={setNodeRef}
      title={locked ? "Only the assignee or an admin can move this ticket" : undefined}
      className={`touch-none ${
        disabled
          ? "cursor-wait opacity-60"
          : locked
            ? "cursor-pointer"
            : "cursor-grab active:cursor-grabbing"
      } ${isDragging ? "opacity-40" : ""}`}
      {...listeners}
      {...attributes}
      onClick={() => {
        // onDragEnd runs before this click. A real drag sets didDrag so the
        // drop does not also open the drawer.
        if (didDrag.current) return;
        onOpen(ticket.id);
      }}
    >
      <TicketCard ticket={ticket} />
    </div>
  );
}
