"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut, X } from "lucide-react";
import { logout } from "@/lib/auth-service";

export default function SignOutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading]);

  async function handleSignOut() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      await logout();
      setOpen(false);
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Logout failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-[#2A4165]/60 dark:hover:text-white transition-colors"
      >
        <LogOut size={19} />
        Logout
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !loading) {
              setOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-heading"
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-600 bg-slate-800 shadow-2xl"
          >
            <div className="flex items-center justify-between bg-[#14213D] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/10 p-2.5">
                  <LogOut size={20} className="text-blue-200" />
                </div>

                <h2
                  id="logout-heading"
                  className="text-lg font-semibold text-white"
                >
                  Confirm Logout
                </h2>
              </div>

              <button
                type="button"
                aria-label="Close dialog"
                disabled={loading}
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm leading-6 text-slate-100">
                Are you sure you want to log out of PolyMate?
                You will need to sign in again to access your account.
              </p>

              <p className="mt-3 text-xs leading-5 text-slate-300">
                Your saved profile and study materials will remain safe.
              </p>

              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {error}
                </p>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl border border-slate-500 bg-slate-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-600 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSignOut}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="animate-spin"
                      />
                      Logging out...
                    </>
                  ) : (
                    <>
                      <LogOut size={17} />
                      Logout
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



