"use client";

/**
 * Manages the dark/light theme.
 * - Reads preference from localStorage on mount (falls back to system pref).
 * - Writes the `dark` class onto <html> for Tailwind's `darkMode: "class"`.
 * - Exposes { theme, toggle } via context for any client component to use.
 *
 * The blocking script is inserted into <head> via useServerInsertedHTML so
 * the browser runs it while parsing HTML, before first paint. It is not part
 * of the React tree, so the client renderer never tries to execute a <script>.
 */

import { useServerInsertedHTML } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";

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

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Next flushes server-inserted HTML on every stream chunk. Emit the
  // blocking script once; later flushes must return nothing.
  const hasInsertedThemeScript = useRef(false);
  useServerInsertedHTML(() => {
    if (hasInsertedThemeScript.current) return null;
    hasInsertedThemeScript.current = true;
    return (
      <script id="ticksy-theme" dangerouslySetInnerHTML={{ __html: themeScript }} />
    );
  });

  // Start with "light" — the FOUC script already applied the right class
  // before hydration, so there is no visible flicker.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // After mount, read the current class so React state matches the DOM.
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  function toggle() {
    setTheme((current) => {
      const next: Theme = current === "light" ? "dark" : "light";
      const html = document.documentElement;
      html.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem("ticksy-theme", next);
      } catch {
        // Private browsing may block localStorage — silently ignore.
      }
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
