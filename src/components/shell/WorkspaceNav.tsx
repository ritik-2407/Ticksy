import Link from "next/link";

/**
 * Board, Members, and (for admins) Settings, for one workspace.
 */

export function WorkspaceNav({
  slug,
  current,
  showSettings = false,
}: {
  slug: string;
  current: "board" | "members" | "settings";
  showSettings?: boolean;
}) {
  return (
    <nav className="flex items-center gap-1" aria-label="Workspace">
      <NavLink href={`/${slug}`} active={current === "board"}>
        Board
      </NavLink>
      <NavLink href={`/${slug}/members`} active={current === "members"}>
        Members
      </NavLink>
      {showSettings ? (
        <NavLink href={`/${slug}/settings`} active={current === "settings"}>
          Settings
        </NavLink>
      ) : null}
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-2.5 py-1 text-sm transition-colors duration-150 ${
        active
          ? "bg-gray-900/8 dark:bg-white/10 font-medium text-gray-900 dark:text-gray-100"
          : "text-gray-500 dark:text-gray-400 hover:bg-gray-900/5 dark:hover:bg-white/5"
      }`}
    >
      {children}
    </Link>
  );
}
