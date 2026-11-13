"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext =
  createContext<ThemeContextType | null>(null);

const THEME_KEY = "polymate-theme";
const THEME_EVENT = "polymate-theme-change";

function getTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);

  if (saved === "light" || saved === "dark") {
    return saved;
  }

  return window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches
    ? "dark"
    : "light";
}

function getServerTheme(): Theme {
  return "light";
}

function subscribe(callback: () => void) {
  const media = window.matchMedia(
    "(prefers-color-scheme: dark)"
  );

  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", callback);
  media.addEventListener("change", callback);

  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", callback);
    media.removeEventListener("change", callback);
  };
}

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const theme = useSyncExternalStore(
    subscribe,
    getTheme,
    getServerTheme
  );

  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      theme === "dark"
    );

    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";

    localStorage.setItem(THEME_KEY, next);

    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used within ThemeProvider"
    );
  }

  return context;
}
