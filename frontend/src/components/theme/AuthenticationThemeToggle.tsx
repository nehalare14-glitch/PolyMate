"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Palette, Loader2 } from "lucide-react";

import {
  getAuthTheme,
  updateAuthTheme,
  type AuthTheme,
} from "@/lib/auth-theme";

export default function AuthenticationThemeToggle() {
  const [theme, setTheme] = useState<AuthTheme>("light");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    getAuthTheme(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setTheme(value);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  async function handleToggle() {
    if (loading || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const next = theme === "light" ? "dark" : "light";

      const savedTheme = await updateAuthTheme(next);

      setTheme(savedTheme);

      setMessage(
        "Authentication theme updated for all users."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update theme"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">

      <div className="mb-5 flex items-center gap-3">
        <Palette size={24} className="text-blue-600" />

        <div>
          <h2 className="font-bold text-slate-900 dark:text-white">
            Appearance Settings
          </h2>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Global authentication appearance
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">

        <div className="min-w-0">
          <h3 className="text-sm font-semibold dark:text-white">
            Authentication Theme
          </h3>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Change login, registration and password recovery
            appearance for all users.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={theme === "dark"}
          aria-label="Authentication dark theme"
          onClick={handleToggle}
          disabled={loading || saving}
          className={`relative flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors disabled:opacity-50 ${
            theme === "dark"
              ? "bg-blue-600"
              : "bg-slate-300"
          }`}
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full bg-white text-blue-600 transition-transform ${
              theme === "dark"
                ? "translate-x-6"
                : "translate-x-0"
            }`}
          >
            {loading || saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : theme === "dark" ? (
              <Moon size={14} />
            ) : (
              <Sun size={14} />
            )}
          </span>
        </button>

      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Current theme: {theme === "dark" ? "Dark" : "Light"}.
        Student and Faculty dashboards remain independent.
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="mt-3 text-sm text-green-600">
          {message}
        </p>
      )}

    </section>
  );
}
