import Link from "next/link";

/**
 * Board and Members, for one workspace.
 * Both pages render this so you can move between them.
 */

export function WorkspaceNav({
  slug,
  current,
}: {
  slug: string;
  current: "board" | "members";
}) {
  return (
    <nav className="flex items-center gap-1" aria-label="Workspace">
      <NavLink href={`/${slug}`} active={current === "board"}>
        Board
      </NavLink>
      <NavLink href={`/${slug}/members`} active={current === "members"}>
        Members
      </NavLink>
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
      className={`rounded-md px-2.5 py-1 text-sm ${
        active ? "bg-gray-100 font-medium text-gray-900" : "text-gray-500 hover:bg-gray-50"
      }`}
    >
      {children}
    </Link>
  );
}
