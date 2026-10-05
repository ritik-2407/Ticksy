/**
 * src/app/(auth)/sign-in/page.tsx
 *
 * The custom sign-in page — loaded when:
 *   1. A user hits /sign-in directly.
 *   2. NextAuth redirects here because pages.signIn = "/sign-in" in auth.ts.
 *   3. Any protected route finds no session and redirects the user here.
 *
 * HOW the Google button works (Server Action pattern — NextAuth v5 style):
 *   - The <form>'s action is an inline async server action (the "use server" directive).
 *   - When submitted, Next.js runs it on the server.
 *   - signIn("google") triggers Google's OAuth redirect (no client JS needed).
 *   - After Google redirects back, NextAuth creates the session and sends
 *     the user to the `redirectTo` URL — here "/" (the dashboard).
 *
 * WHY a <form> and not an onClick?
 *   Server Actions work without JavaScript — the page degrades gracefully.
 *   It also avoids the need for a "use client" directive, keeping this
 *   component a pure Server Component.
 */

import { signIn } from "@/auth";

export default function SignInPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Use your Google account to continue
          </p>
        </div>

        {/* Google sign-in — Server Action */}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            {/* Google "G" icon — inline SVG, no external dependency */}
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          By continuing, you agree to Ticksy&apos;s terms of service.
        </p>
      </div>
    </div>
  );
}
