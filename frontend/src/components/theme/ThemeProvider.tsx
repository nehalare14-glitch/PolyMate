"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { usePathname } from "next/navigation";
import { getAuthTheme } from "@/lib/auth-theme";

type Theme = "light" | "dark";

type ThemeGroup =
  | "admin"
  | "student"
  | "faculty"
  | "auth"
  | "public";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext =
  createContext<ThemeContextType | null>(null);

const THEME_EVENT = "polymate-theme-change";

function getThemeGroup(pathname: string): ThemeGroup {
  const segments = pathname.split("/").filter(Boolean);

  const authPages = [
    "login",
    "register",
    "forgot-password",
    "reset-password",
    "verify-email",
  ];

  if (
    segments.some((segment) =>
      authPages.includes(segment)
    )
  ) {
    return "auth";
  }

  if (
    pathname === "/student" ||
    pathname.startsWith("/student/")
  ) {
    return "student";
  }

  if (
    pathname === "/faculty" ||
    pathname.startsWith("/faculty/")
  ) {
    return "faculty";
  }

  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  ) {
    return "admin";
  }

  return "auth";
}

function getTheme(group: ThemeGroup): Theme {
  if (group === "auth" || group === "public") {
    return "light";
  }

  try {
    return localStorage.getItem(
      `polymate-theme-${group}`
    ) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

function getServerTheme(): Theme {
  return "light";
}

function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const group = getThemeGroup(pathname || "/");

  const [authTheme, setAuthTheme] =
    useState<Theme>("light");

  const dashboardTheme = useSyncExternalStore(
    subscribe,
    () => getTheme(group),
    getServerTheme
  );

  useEffect(() => {
    if (group !== "auth") return;

    const controller = new AbortController();

    async function refreshTheme() {
      try {
        const value = await getAuthTheme(
          controller.signal
        );

        if (!controller.signal.aborted) {
          setAuthTheme(value);
        }
      } catch {
        // Keep the last known theme if the API is unavailable.
      }
    }

    void refreshTheme();

    window.addEventListener("focus", refreshTheme);

    const interval = window.setInterval(
      refreshTheme,
      30000
    );

    return () => {
      controller.abort();

      window.removeEventListener(
        "focus",
        refreshTheme
      );

      window.clearInterval(interval);
    };
  }, [group, pathname]);

  const theme: Theme =
    group === "auth"
      ? authTheme
      : dashboardTheme;

  useLayoutEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      theme === "dark"
    );

    document.documentElement.style.colorScheme =
      theme;
  }, [theme, pathname]);

  function toggleTheme() {
    if (group === "auth" || group === "public") {
      return;
    }

    const next = theme === "light" ? "dark" : "light";

    try {
      localStorage.setItem(
        `polymate-theme-${group}`,
        next
      );

      window.dispatchEvent(
        new Event(THEME_EVENT)
      );
    } catch {
      console.warn("Unable to save theme preference");
    }
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


