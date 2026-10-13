import Image from "next/image";

/**
 * Ticksy logo mark (ticket icon on gold). Source: /public/logo.png.
 * `size` is in px; the rounded corners scale with it.
 */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="" // decorative: always rendered next to the "Ticksy" wordmark
      width={size}
      height={size}
      priority
      className={`shrink-0 shadow-sm ${className}`}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.25) }}
    />
  );
}
