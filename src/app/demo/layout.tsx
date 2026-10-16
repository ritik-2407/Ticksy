/**
 * /demo — public shell. No sign-in needed.
 *
 * This is deliberately NOT inside the (app) group: that layout assumes a
 * workspace and a session. Here a visitor with no account sees a board on
 * seeded, in-browser data. If they happen to be signed in, the header links
 * back to their workspaces instead of asking them to sign in.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { LogoMark } from "@/components/shell/LogoMark";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

export const metadata: Metadata = {
  title: "Demo · Ticksy",
  description: "Try the Ticksy board without signing in. Nothing you do is saved.",
};

async function isSignedIn(): Promise<boolean> {
  // The demo must work even if auth or the database is unavailable.
  try {
    const session = await auth();
    return Boolean(session?.user?.id);
  } catch {
    return false;
  }
}

export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await isSignedIn();

  return (
    <div className="flex min-h-screen flex-col bg-[#faf7f2] dark:bg-zinc-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="landing-blob absolute -top-48 -left-24 h-[560px] w-[560px] rounded-full bg-orange-200/25 dark:bg-orange-900/10 blur-3xl" style={{ animationDelay: "0s" }} />
        <div className="landing-blob absolute -top-24 right-0 h-[400px] w-[400px] rounded-full bg-amber-200/20 dark:bg-amber-900/8 blur-3xl" style={{ animationDelay: "2s" }} />
        <div className="landing-blob absolute bottom-0 left-1/3 h-[400px] w-[500px] rounded-full bg-orange-100/15 dark:bg-orange-950/10 blur-3xl" style={{ animationDelay: "4s" }} />
      </div>

      <header className="glass-header sticky top-0 z-30">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between gap-6 px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 transition-opacity duration-150 hover:opacity-70"
          >
            <LogoMark size={28} />
            <span className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              Ticksy
            </span>
            <span className="rounded-full bg-amber-600/10 dark:bg-amber-400/10 px-2.5 py-1 text-xs font-medium">
              <span className="gold-text">Demo</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-3">
            <ThemeToggle />
            {signedIn ? (
              <Link href="/" className="btn-outline">
                Your workspaces
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="gold-surface rounded-lg px-4 py-1.5 text-xs font-semibold shadow-sm hover:shadow-md"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
