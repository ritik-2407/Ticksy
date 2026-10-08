/**
 * The URL we send someone to after Google sign-in.
 * Only same-origin paths are allowed, so a crafted callbackUrl cannot
 * bounce the browser to another site.
 */
export function safeCallbackUrl(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/";
  if (raw.includes("://")) return "/";
  return raw;
}
