"use client";

import { useDraggable } from "@dnd-kit/core";
import { TicketCard } from "@/components/kanban/TicketCard";
import type { TicketCard as Ticket } from "@/lib/ticket";

export function DraggableTicket({
  ticket,
  disabled,
  didDrag,
  onOpen,
}: {
  ticket: Ticket;
  disabled: boolean;
  didDrag: { current: boolean };
  onOpen: (ticketId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={`touch-none ${disabled ? "cursor-wait opacity-60" : "cursor-grab active:cursor-grabbing"} ${isDragging ? "opacity-40" : ""}`}
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
