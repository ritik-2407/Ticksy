"use client";

import { useDroppable } from "@dnd-kit/core";
import { DraggableTicket } from "@/components/kanban/DraggableTicket";
import type { TicketCard } from "@/lib/ticket";


export function Column({
  status,
  title,
  tickets,
  pendingId,
  canMove,
  didDrag,
  onOpen,
}: {
  status: TicketCard["status"];
  title: string;
  tickets: TicketCard[];
  pendingId: string | null;
  canMove: (ticket: TicketCard) => boolean;
  didDrag: { current: boolean };
  onOpen: (ticketId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      aria-label={title}
      className={`flex min-w-56 flex-1 flex-col transition-colors duration-150
                  ${isOver ? "bg-black/[0.025] dark:bg-white/[0.025]" : ""}`}
    >
      {/* Column header */}
      <header className="flex items-center justify-center px-4 py-3
                         border-b border-black/[0.05] dark:border-white/[0.05]">
        <h2 className="gold-text text-xs font-bold uppercase tracking-widest">
          {title}
        </h2>
      </header>

      {/* Ticket list — scrolls independently */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {tickets.length === 0 ? (
          <p className="m-auto select-none text-center text-xs text-gray-400 dark:text-gray-600">
            No tickets
          </p>
        ) : (
          tickets.map((ticket) => (
            <DraggableTicket
              key={ticket.id}
              ticket={ticket}
              disabled={pendingId === ticket.id}
              locked={!canMove(ticket)}
              didDrag={didDrag}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </section>
  );
}
