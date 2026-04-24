import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

type Theme = "dark" | "light";
type ThemeChoice = "dark" | "light" | "auto";

interface ThemeContextValue {
  /** Resolved theme actually applied to the document. */
  theme: Theme;
  /** What the user picked. "auto" follows the system preference. */
  themeChoice: ThemeChoice;
  /** Set the explicit choice. "auto" subscribes to prefers-color-scheme. */
  setThemeChoice: (choice: ThemeChoice) => void;
  /** Back-compat: setting an explicit theme also pins the choice. */
  setTheme: (theme: Theme) => void;
  /** Toggle between dark and light, leaving auto behind. */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "themeChoice";
const LEGACY_KEY = "theme";

function readSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredChoice(): ThemeChoice {
  if (typeof window === "undefined") return "auto";
  const stored = localStorage.getItem(STORAGE_KEY) as ThemeChoice | null;
  if (stored === "dark" || stored === "light" || stored === "auto") return stored;
  // Migrate from the older "theme" key (only ever "dark" / "light").
  const legacy = localStorage.getItem(LEGACY_KEY) as Theme | null;
  if (legacy === "dark" || legacy === "light") return legacy;
  return "auto";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeChoice, setChoice] = useState<ThemeChoice>(readStoredChoice);
  const [theme, setResolvedTheme] = useState<Theme>(() => {
    const choice = readStoredChoice();
    return choice === "auto" ? readSystemTheme() : choice;
  });

  // Subscribe to OS theme changes only while we're in auto mode. The
  // listener auto-detaches as soon as the user pins a choice.
  useEffect(() => {
    if (themeChoice !== "auto") {
      setResolvedTheme(themeChoice);
      return;
    }
    setResolvedTheme(readSystemTheme());
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setResolvedTheme(e.matches ? "dark" : "light");
    // Older Safari only supports addListener / removeListener.
    if (mql.addEventListener) mql.addEventListener("change", handler);
    else mql.addListener(handler);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", handler);
      else mql.removeListener(handler);
    };
  }, [themeChoice]);

  // Apply the resolved theme to the document root.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  }, [theme]);

  // Persist the user's choice (not the resolved value) so we re-honour
  // "auto" on the next visit.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, themeChoice);
      // Keep the legacy key in sync with the resolved value for any
      // older code that still reads it.
      localStorage.setItem(LEGACY_KEY, theme);
    } catch { /* ignore quota errors */ }
  }, [themeChoice, theme]);

  const setThemeChoice = useCallback((choice: ThemeChoice) => setChoice(choice), []);
  const setTheme = useCallback((t: Theme) => setChoice(t), []);
  const toggleTheme = useCallback(() => {
    setChoice(prev => {
      const current = prev === "auto" ? readSystemTheme() : prev;
      return current === "dark" ? "light" : "dark";
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themeChoice, setThemeChoice, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
