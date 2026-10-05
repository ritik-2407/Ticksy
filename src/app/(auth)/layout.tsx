/**
 * src/app/(auth)/layout.tsx
 *
 * Route group: (auth)
 * The parentheses mean this folder is invisible in the URL.
 * /sign-in → renders this layout + sign-in/page.tsx
 * /sign-up → renders this layout + sign-up/page.tsx (if we add it later)
 *
 * WHY a separate layout?
 *   Auth pages need a completely different look from the main app:
 *   - Centered card, no sidebar, no navbar
 *   - Brand logo at the top
 *   This layout gives us that without polluting the root layout.tsx.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      {/* Brand mark */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Ticksy
        </h1>
        <p className="mt-1 text-sm text-gray-500">Team issue tracker</p>
      </div>

      {/* Page content (sign-in card, etc.) */}
      {children}
    </div>
  );
}
