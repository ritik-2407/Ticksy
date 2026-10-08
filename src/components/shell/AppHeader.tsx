/**
 * Signed-in chrome: brand, who you are, theme toggle, sign out.
 * The home dashboard and the workspace layout both render this.
 * Sign out is a server action, same pattern as the Google button on /sign-in.
 */

import { signOut } from "@/auth";
import Link from "next/link";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppHeader({
  name,
  email,
  image,
}: {
  name: string;
  email?: string | null;
  image?: string | null;
}) {
  const label = name.trim() || "You";

  return (
    <header className="glass-header sticky top-0 z-30 flex items-center justify-between px-6 py-3">
      <Link
        href="/"
        className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100
                   hover:opacity-70 transition-opacity duration-150"
      >
        Ticksy
      </Link>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <ThemeToggle />

        <span className="inline-flex items-center gap-2" title={email ?? undefined}>
          {image ? (
            // Google avatars. next/image needs a remotePatterns allow-list we do not have yet.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              className="h-7 w-7 rounded-full bg-gray-100 dark:bg-zinc-800 ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
            />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full
                             bg-gray-200 dark:bg-zinc-700
                             text-[10px] font-medium text-gray-700 dark:text-gray-300
                             ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
              {initials(label)}
            </span>
          )}
          <span className="hidden text-sm text-gray-700 dark:text-gray-300 sm:inline">
            {label}
          </span>
        </span>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="btn-ghost text-sm text-gray-500 dark:text-gray-400"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
