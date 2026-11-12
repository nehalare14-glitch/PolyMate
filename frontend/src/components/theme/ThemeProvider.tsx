"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("polymate-theme");

    const preferred: Theme =
      saved === "dark" || saved === "light"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    setTheme(preferred);
    document.documentElement.classList.toggle(
      "dark",
      preferred === "dark"
    );
    document.documentElement.style.colorScheme = preferred;
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";

    setTheme(next);
    localStorage.setItem("polymate-theme", next);

    document.documentElement.classList.toggle(
      "dark",
      next === "dark"
    );
    document.documentElement.style.colorScheme = next;
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
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
