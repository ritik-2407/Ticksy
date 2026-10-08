/**
 * App shell for signed-in workspace pages.
 * The (app) group does not appear in the URL: /acme-corp renders this layout.
 */

import { AppHeader } from "@/components/shell/AppHeader";
import { auth } from "@/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
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
