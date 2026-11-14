"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getCurrentProfile } from "@/lib/auth-service";
import { getDashboardPath, type UserRole } from "@/lib/roles";

export default function SessionRestore({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        // Wait until Firebase restores its saved session.
        await auth.authStateReady();

        if (!active) return;

        const user = auth.currentUser;

        // No saved session: show the normal page.
        if (!user) {
          setChecking(false);
          return;
        }

        // Revalidate the existing Firebase account.
        await user.reload();

        if (!active) return;

        if (auth.currentUser?.uid !== user.uid) {
          setChecking(false);
          return;
        }

        if (!user.emailVerified) {
          setChecking(false);
          return;
        }

        // Retrieve the current role from the backend.
        const profile = await getCurrentProfile() as {
          user: {
            role: UserRole;
          };
        };

        if (!active) return;

        if (auth.currentUser?.uid !== user.uid) {
          setChecking(false);
          return;
        }

        const role = profile.user.role;

        if (
          role !== "student" &&
          role !== "faculty" &&
          role !== "admin"
        ) {
          throw new Error("Invalid account role.");
        }

        // Existing dashboard guards verify permissions.
        router.replace(getDashboardPath(role));

      } catch (err) {
        if (!active) return;

        if (!auth.currentUser) {
          setChecking(false);
          return;
        }

        if (
          err instanceof Error &&
          (
            err.message.includes("Profile not found") ||
            err.message.includes("not verified")
          )
        ) {
          setChecking(false);
          return;
        }

        // Never clear a valid session because of a network error.
        setError(
          "Unable to connect to PolyMate. Your session has been preserved. Please try again."
        );
      }
    }

    void restoreSession();

    return () => {
      active = false;
    };

  }, [router, attempt]);

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6 dark:bg-[#0B1220]">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Connection unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {error}
          </p>

          <button
            type="button"
            onClick={() => {
              setError("");
              setChecking(true);
              setAttempt((value) => value + 1);
            }}
            className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (checking) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-[#0B1220]">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-400">
            PolyMate
          </h1>

          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Restoring your session...
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
