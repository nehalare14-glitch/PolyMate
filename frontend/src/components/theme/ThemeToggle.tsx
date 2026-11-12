"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        theme === "dark"
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
      title={
        theme === "dark"
          ? "Light mode"
          : "Dark mode"
      }
      className="
        inline-flex h-10 w-10 shrink-0 items-center justify-center
        rounded-xl border border-slate-200
        bg-white text-slate-700
        hover:bg-slate-100
        dark:border-slate-700
        dark:bg-slate-800
        dark:text-slate-200
        dark:hover:bg-slate-700
      "
    >
      {theme === "dark" ? (
        <Sun size={20} />
      ) : (
        <Moon size={20} />
      )}
    </button>
  );
}



