import type { TicketCard as Ticket } from "@/lib/ticket";

const PRIORITY_STYLE: Record<Ticket["priority"], string> = {
  LOW: "bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400",
  MEDIUM: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400",
  HIGH: "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400",
  CRITICAL: "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400",
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
    <article
      className="glass rounded-xl p-3
                 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)]
                 transition-all duration-150 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-snug text-gray-900 dark:text-gray-100">
          {ticket.title}
        </h3>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${PRIORITY_STYLE[ticket.priority]}`}
        >
          {ticket.priority}
        </span>
      </div>

      {ticket.description ? (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {ticket.description}
        </p>
      ) : null}

      {ticket.labels.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1">
          {ticket.labels.map((label) => (
            <li
              key={label.id}
              className="inline-flex items-center gap-1 rounded-full
                         bg-black/[0.04] dark:bg-white/[0.08]
                         border border-black/[0.06] dark:border-white/[0.08]
                         px-1.5 py-0.5 text-[10px] text-gray-600 dark:text-gray-400"
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

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        {assignee ? (
          <span className="inline-flex items-center gap-1.5">
            {assignee.image ? (
              // Remote avatars (Google, Dicebear). next/image would need
              // a remotePatterns allow-list we do not have yet.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={assignee.image}
                alt=""
                className="h-5 w-5 rounded-full bg-gray-100 dark:bg-zinc-800"
              />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full
                               bg-gray-200 dark:bg-zinc-700
                               text-[10px] font-medium text-gray-700 dark:text-gray-300">
                {initials(assignee.name)}
              </span>
            )}
            {assignee.name}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-600">Unassigned</span>
        )}

        {ticket._count.comments > 0 ? (
          <span className="flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M14 1H2C1.4 1 1 1.4 1 2v9c0 .6.4 1 1 1h1v3l3-3h8c.6 0 1-.4 1-1V2c0-.6-.4-1-1-1z"/>
            </svg>
            {ticket._count.comments}
          </span>
        ) : null}
      </div>
    </article>
  );
}
