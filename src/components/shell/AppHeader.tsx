/**
 * Signed-in chrome: brand, who you are, sign out.
 * The home dashboard and the workspace layout both render this.
 * Sign out is a server action, same pattern as the Google button on /sign-in.
 */

import { signOut } from "@/auth";
import Link from "next/link";

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
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <Link href="/" className="text-sm font-semibold tracking-tight text-gray-900">
        Ticksy
      </Link>

      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-2" title={email ?? undefined}>
          {image ? (
            // Google avatars. next/image needs a remotePatterns allow-list we do not have yet.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-7 w-7 rounded-full bg-gray-100" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-700">
              {initials(label)}
            </span>
          )}
          <span className="hidden text-sm text-gray-700 sm:inline">{label}</span>
        </span>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
