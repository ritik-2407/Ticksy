/**
 * src/app/(auth)/layout.tsx
 *
 * Auth pages need a centered card, no sidebar, no navbar.
 */

import { LogoMark } from "@/components/shell/LogoMark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-zinc-950
                    flex flex-col items-center justify-center px-4
                    transition-colors duration-300">
      {/* Decorative background blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full
                        bg-orange-100/40 dark:bg-orange-950/25 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full
                        bg-amber-100/40 dark:bg-amber-950/20 blur-3xl" />
      </div>

      {/* Brand mark */}
      <div className="mb-8 flex flex-col items-center text-center">
        <LogoMark size={56} className="mb-4 !shadow-md" />
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Ticksy
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Team issue tracker</p>
      </div>

      {/* Page content (sign-in card, etc.) */}
      {children}
    </div>
  );
}
