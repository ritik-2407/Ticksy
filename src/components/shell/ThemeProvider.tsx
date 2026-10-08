"use client";

/**
 * Manages the dark/light theme.
 * - Reads preference from localStorage on mount (falls back to system pref).
 * - Writes the `dark` class onto <html> for Tailwind's `darkMode: "class"`.
 * - Exposes { theme, toggle } via context for any client component to use.
 *
 * NOTE: A tiny inline script in layout.tsx sets the class synchronously
 * before the first paint, preventing flash-of-wrong-theme (FOUC).
 */

import { createContext, useContext, useEffect, useState } from "react";

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
