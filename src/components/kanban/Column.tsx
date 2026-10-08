"use client";

import { useDroppable } from "@dnd-kit/core";
import { DraggableTicket } from "@/components/kanban/DraggableTicket";
import type { TicketCard } from "@/lib/ticket";

export function Column({
  status,
  title,
  tickets,
  pendingId,
  didDrag,
  onOpen,
}: {
  status: TicketCard["status"];
  title: string;
  tickets: TicketCard[];
  pendingId: string | null;
  didDrag: { current: boolean };
  onOpen: (ticketId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      aria-label={title}
      className={`flex min-h-64 w-72 shrink-0 flex-col rounded-xl
                  bg-black/[0.03] dark:bg-white/[0.03]
                  border border-black/[0.06] dark:border-white/[0.06]
                  backdrop-blur-sm
                  transition-all duration-150
                  ${isOver
                    ? "ring-2 ring-gray-400 dark:ring-gray-500 bg-black/[0.05] dark:bg-white/[0.06]"
                    : ""
                  }`}
    >
      <header className="flex items-center justify-between px-3 py-3">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
        <span className="rounded-full bg-white/70 dark:bg-white/10 px-2 py-0.5
                         text-xs font-medium text-gray-500 dark:text-gray-400
                         border border-black/[0.06] dark:border-white/[0.08]">
          {tickets.length}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-2 px-2 pb-3">
        {tickets.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-gray-400 dark:text-gray-600">
            No tickets
          </p>
        ) : (
          tickets.map((ticket) => (
            <DraggableTicket
              key={ticket.id}
              ticket={ticket}
              disabled={pendingId === ticket.id}
              didDrag={didDrag}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </section>
  );
}
