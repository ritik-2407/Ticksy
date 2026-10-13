/**
 * Signed-in chrome — mirrors the landing page navbar in structure and glass style.
 * Logo left · nav links center · user + actions right.
 */

import { signOut } from "@/auth";
import Link from "next/link";
import { LogoMark } from "@/components/shell/LogoMark";
import { AppNav } from "@/components/shell/AppNav";
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
  slug,
  showSettings = false,
}: {
  name: string;
  email?: string | null;
  image?: string | null;
  slug?: string | null;
  showSettings?: boolean;
}) {
  const label = name.trim() || "You";

  return (
    <header className="glass-header sticky top-0 z-30">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between gap-6 px-6">

        {/* ── Logo ── */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 transition-opacity duration-150 hover:opacity-70"
        >
          <LogoMark size={28} />
          <span className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            Ticksy
          </span>
        </Link>

        {/* ── Centre nav ── */}
        <div className="flex min-w-0 flex-1 justify-center">
          <AppNav slug={slug} showSettings={showSettings} />
        </div>

        {/* ── Right: theme · avatar · sign-out ── */}
        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle />

          {/* Avatar + name */}
          <span
            className="hidden items-center gap-2 sm:inline-flex"
            title={email ?? undefined}
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt=""
                className="h-7 w-7 rounded-full ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
              />
            ) : (
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full
                           bg-gray-200 dark:bg-zinc-700
                           text-[10px] font-medium text-gray-700 dark:text-gray-300
                           ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
              >
                {initials(label)}
              </span>
            )}
            <span className="max-w-[8rem] truncate text-sm text-gray-700 dark:text-gray-300">
              {label}
            </span>
          </span>

          {/* Sign out */}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="btn-outline">
              Sign out
            </button>
          </form>
        </div>

      </div>
    </header>
  );
}
