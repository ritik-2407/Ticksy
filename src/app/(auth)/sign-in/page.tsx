/**
 * src/app/(auth)/sign-in/page.tsx
 *
 * Custom-themed auth hub.
 * Every provider button uses a Next.js server action so we never redirect to
 * the default NextAuth sign-in page — the user stays on our branded UI.
 */

import { signIn } from "@/auth";
import { safeCallbackUrl } from "@/lib/callback";

// ─── Provider icons ──────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
function OrDivider() {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-black/[0.08] dark:border-white/[0.08]" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white/60 dark:bg-zinc-900/60 px-3 text-xs text-gray-400 dark:text-gray-600 backdrop-blur-sm">
          or
        </span>
      </div>
    </div>
  );
}

// ─── Error messages ───────────────────────────────────────────────────────────
const AUTH_ERRORS: Record<string, string> = {
  OAuthAccountNotLinked:
    "This email is already registered with a different provider. Sign in with the one you used originally.",
  OAuthSignin:    "Could not start the sign-in flow. Please try again.",
  OAuthCallback:  "Something went wrong during sign-in. Please try again.",
  OAuthCreateAccount: "Could not create your account. Please try again.",
  Callback:       "Sign-in callback failed. Please try again.",
  Default:        "An unexpected error occurred. Please try again.",
};

// ─── Page ────────────────────────────────────────────────────────────────────
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[]; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const redirectTo = safeCallbackUrl(callbackUrl);
  const errorMessage = error
    ? (AUTH_ERRORS[error] ?? AUTH_ERRORS.Default)
    : null;

  return (
    <div className="w-full max-w-sm">
      <div className="glass rounded-2xl p-8 shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]">

        {/* Heading */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Welcome back
          </h2>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Choose how you&apos;d like to sign in
          </p>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3">
            <svg className="mt-0.5 shrink-0 text-red-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-xs leading-relaxed text-red-700 dark:text-red-400">
              {errorMessage}
            </p>
          </div>
        )}

        {/* ── Google ──────────────────────────────────────────────────────── */}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 mb-3
                       rounded-xl border border-black/[0.1] dark:border-white/[0.1]
                       bg-white/80 dark:bg-white/5 backdrop-blur-sm
                       text-sm font-medium text-gray-700 dark:text-gray-200
                       hover:bg-gray-50 dark:hover:bg-white/10
                       focus:outline-none focus:ring-2 focus:ring-amber-600/30 dark:focus:ring-amber-400/30
                       transition-all duration-150 hover:-translate-y-0.5"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </form>

        {/* ── Divider ─────────────────────────────────────────────────────── */}
        <OrDivider />

        {/* ── GitHub ──────────────────────────────────────────────────────── */}
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5
                       rounded-xl border border-black/[0.1] dark:border-white/[0.1]
                       bg-gray-900 dark:bg-white/[0.07] backdrop-blur-sm
                       text-sm font-medium text-white dark:text-gray-200
                       hover:bg-gray-800 dark:hover:bg-white/[0.12]
                       focus:outline-none focus:ring-2 focus:ring-gray-900/30 dark:focus:ring-white/20
                       transition-all duration-150 hover:-translate-y-0.5"
          >
            <GitHubIcon />
            Continue with GitHub
          </button>
        </form>

        {/* Terms */}
        <p className="mt-7 text-center text-xs text-gray-400 dark:text-gray-600">
          By continuing, you agree to Ticksy&apos;s{" "}
          <span className="underline underline-offset-2 cursor-pointer hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
            terms of service
          </span>
          .
        </p>
      </div>
    </div>
  );
}
