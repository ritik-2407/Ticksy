import type { TicketCard as Ticket } from "@/lib/ticket";

const PRIORITY_STYLE: Record<Ticket["priority"], string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-50 text-blue-700",
  HIGH: "bg-amber-50 text-amber-800",
  CRITICAL: "bg-red-50 text-red-700",
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function TicketCard({ ticket }: { ticket: Ticket }) {
  const assignee = ticket.assignee;

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-snug text-gray-900">{ticket.title}</h3>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${PRIORITY_STYLE[ticket.priority]}`}
        >
          {ticket.priority}
        </span>
      </div>

      {ticket.description ? (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-500">
          {ticket.description}
        </p>
      ) : null}

      {ticket.labels.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1">
          {ticket.labels.map((label) => (
            <li
              key={label.id}
              className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-600"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: label.color }}
                aria-hidden
              />
              {label.name}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        {assignee ? (
          <span className="inline-flex items-center gap-1.5">
            {assignee.image ? (
              // Remote avatars (Google, Dicebear). next/image would need
              // a remotePatterns allow-list we do not have yet.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={assignee.image}
                alt=""
                className="h-5 w-5 rounded-full bg-gray-100"
              />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-700">
                {initials(assignee.name)}
              </span>
            )}
            {assignee.name}
          </span>
        ) : (
          <span className="text-gray-400">Unassigned</span>
        )}

        {ticket._count.comments > 0 ? (
          <span>{ticket._count.comments} comments</span>
        ) : null}
      </div>
    </article>
  );
}
