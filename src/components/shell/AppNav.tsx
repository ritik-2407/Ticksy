"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppNav({
  slug,
  showSettings = false,
}: {
  slug?: string | null;
  showSettings?: boolean;
}) {
  const pathname = usePathname();

  const links: { href: string; label: string; active: boolean }[] = [
    { href: "/", label: "Workspaces", active: pathname === "/" },
  ];

  if (slug) {
    links.push(
      { href: `/${slug}`,           label: "Board",    active: pathname === `/${slug}` },
      { href: `/${slug}/members`,   label: "Members",  active: pathname === `/${slug}/members` }
    );
    if (showSettings) {
      links.push({
        href: `/${slug}/settings`,
        label: "Settings",
        active: pathname === `/${slug}/settings`,
      });
    }
  }

  return (
    <nav
      aria-label="App navigation"
      className="flex items-center gap-6"
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.active ? "page" : undefined}
          className={`relative text-sm transition-colors duration-150 ${
            link.active
              ? "font-medium"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          }`}
        >
          {link.active ? (
            <span className="landing-gradient-text">{link.label}</span>
          ) : (
            link.label
          )}
          {link.active && (
            <span
              aria-hidden
              className="gold-surface absolute -bottom-[1px] left-0 right-0 h-[2px] rounded-full"
            />
          )}
        </Link>
      ))}
    </nav>
  );
}
