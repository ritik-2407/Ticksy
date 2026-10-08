import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/shell/ThemeProvider";

export const metadata: Metadata = {
  title: "Ticksy",
  description: "Team issue tracker",
};

/**
 * The inline script runs synchronously before first paint to apply the
 * saved theme class. This prevents flash-of-wrong-theme (FOUC) on reload.
 */
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('ticksy-theme');
    var m = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (t === 'dark' || (!t && m)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
`.trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC script — must run before React hydrates */}
        {/* eslint-disable-next-line @next/next/no-script-component-in-head */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
