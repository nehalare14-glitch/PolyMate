"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { getCurrentProfile } from "@/lib/auth-service";
import { getDashboardPath, type UserRole } from "@/lib/roles";

type RoleGuardProps = {
  allowedRoles: UserRole[];
  children: ReactNode;
};

const validRoles: UserRole[] = [
  "student",
  "faculty",
  "admin",
  "super_admin",
];

export default function RoleGuard({
  allowedRoles,
  children,
}: RoleGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;

      setAuthorized(false);
      setError("");

      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        await user.reload();

        if (!user.emailVerified) {
          router.replace("/login");
          return;
        }

        const response = await getCurrentProfile() as {
          user: {
            role: UserRole;
            approval_status?: string;
          };
        };
        if (!active) return;

        const role = response.user.role as UserRole;

        if (!validRoles.includes(role)) {
          setError("Your account has an invalid role.");
          return;
        }



        if (!allowedRoles.includes(role)) {
          router.replace(getDashboardPath(role));
          return;
        }

        if (
          role === "faculty" &&
          response.user.approval_status !== "approved"
        ) {
          setError(
            "Your faculty account is awaiting approval. Faculty features are not available yet."
          );
          return;
        }

        setAuthorized(true);
      } catch {
        if (active) {
          setError(
            "Unable to verify your account permissions. Please try again."
          );
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router, allowedRoles.join("|")]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">
            Access verification failed
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            {error}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2 text-white"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">
          Verifying your account permissions...
        </p>
      </main>
    );
  }

  return <>{children}</>;
}




