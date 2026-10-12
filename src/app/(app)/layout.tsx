/**
 * App shell for signed-in workspace pages.
 * The (app) group does not appear in the URL: /acme-corp renders this layout.
 */

import { AppHeader } from "@/components/shell/AppHeader";
import { auth } from "@/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-[#faf7f2] dark:bg-zinc-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Background blobs — same as landing + dashboard */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="landing-blob absolute -top-48 -left-24 h-[560px] w-[560px] rounded-full bg-orange-200/25 dark:bg-orange-900/10 blur-3xl" style={{ animationDelay: "0s" }} />
        <div className="landing-blob absolute -top-24 right-0 h-[400px] w-[400px] rounded-full bg-amber-200/20 dark:bg-amber-900/8 blur-3xl" style={{ animationDelay: "2s" }} />
        <div className="landing-blob absolute bottom-0 left-1/3 h-[400px] w-[500px] rounded-full bg-orange-100/15 dark:bg-orange-950/10 blur-3xl" style={{ animationDelay: "4s" }} />
      </div>

      {session?.user ? (
        <AppHeader
          name={session.user.name?.trim() || "You"}
          email={session.user.email}
          image={session.user.image}
        />
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
