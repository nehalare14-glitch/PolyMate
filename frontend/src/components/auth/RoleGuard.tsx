"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { subscribeSmartSync } from "@/lib/smart-sync";

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
];

export default function RoleGuard({
  allowedRoles,
  children,
}: RoleGuardProps) {
  const router = useRouter();
  const allowedRoleKey = allowedRoles.join("|");
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeSmartSync(
      auth,
      async (user, initial) => {
        if (!active) return;

        if (initial) {
          setAuthorized(false);
          setError("");
        }

        if (!user) {
          setAuthorized(false);
          router.replace("/login");
          return;
        }

        const uid = user.uid;

        function isCurrent() {
          return active && auth.currentUser?.uid === uid;
        }

        function deny(message: string) {
          if (!isCurrent()) return;

          setAuthorized(false);
          setError(message);
        }

        try {
          // Revalidate the Firebase account.
          await user.reload();

          if (!isCurrent()) return;

          if (!user.emailVerified) {
            setAuthorized(false);
            router.replace("/login");
            return;
          }

          // Refresh credentials before checking the backend.
          await user.getIdToken(true);

          if (!isCurrent()) return;

          // Flask remains the authority for account permissions.
          const response = await getCurrentProfile() as {
            user: {
              role: UserRole;
              approval_status?: string;
            };
          };

          if (!isCurrent()) return;

          const role = response.user.role;

          if (!validRoles.includes(role)) {
            deny("Your account has an invalid role.");
            return;
          }

          if (!allowedRoleKey.split("|").includes(role)) {
            setAuthorized(false);
            router.replace(getDashboardPath(role));
            return;
          }

          if (
            role === "faculty" &&
            response.user.approval_status !== "approved"
          ) {
            deny(
              "Your faculty account is not approved. " +
              "Please contact your administrator."
            );
            return;
          }

          // Keep the existing portal mounted during
          // successful background verification.
          setError("");
          setAuthorized(true);

        } catch (err) {
          if (!isCurrent()) return;

          const code =
            typeof err === "object" &&
            err !== null &&
            "code" in err
              ? String(err.code)
              : "";

          if (
            code === "auth/user-disabled" ||
            code === "auth/user-not-found" ||
            code === "auth/user-token-expired" ||
            code === "auth/invalid-user-token"
          ) {
            deny(
              "Your account is no longer authorized. " +
              "Please contact your administrator."
            );
            return;
          }

          // Fail closed if account permissions
          // cannot be verified.
          deny(
            "Unable to verify your account permissions. " +
            "Please check your connection or sign in again."
          );
        }
      },
      { intervalMs: 30000 }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router, allowedRoleKey]);

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
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
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-slate-500">
          Verifying your account permissions...
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
