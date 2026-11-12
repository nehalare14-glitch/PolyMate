"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, UserRound, ShieldCheck,
  LockKeyhole, Mail, LogOut, Save,
  CheckCircle2, AlertCircle, LoaderCircle
} from "lucide-react";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

const API =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000";

type Profile = {
  email: string;
  full_name: string | null;
  role: string;
};

const card =
  "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7";

export default function SuperAdminSettings() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        await user.reload();
        const token = await user.getIdToken(true);

        const response = await fetch(`${API}/api/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          cache: "no-store"
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load profile");
        }

        if (data.user?.role !== "super_admin") {
          throw new Error("Super Admin access required");
        }

        if (active) {
          setProfile(data.user);
          setName(data.user.full_name || "");
          setVerified(user.emailVerified);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load settings"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  const validName =
    name.trim().length >= 2 && name.trim().length <= 80;

  const changed =
    !!profile && name.trim() !== (profile.full_name || "");

  async function saveProfile() {
    if (!profile || !validName || !changed || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Please sign in again.");

      const token = await user.getIdToken();

      const response = await fetch(`${API}/api/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: name.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save profile");
      }

      setProfile({
        ...profile,
        full_name: name.trim()
      });

      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save profile"
      );
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (resetting) return;

    setResetting(true);
    setError("");
    setMessage("");

    try {
      const email = auth.currentUser?.email;
      if (!email) throw new Error("Please sign in again.");

      await sendPasswordResetEmail(auth, email);

      setMessage("Password reset email requested. Check your inbox.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send reset email"
      );
    } finally {
      setResetting(false);
    }
  }

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    try {
      await signOut(auth);
      router.replace("/login");
    } catch {
      setError("Unable to log out.");
      setLoggingOut(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">

        <div>
          <Link
            href="/super-admin/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </Link>

          <h1 className="mt-5 text-3xl font-bold tracking-tight">
            Account Settings
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Manage your Super Admin account and security.
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-sm">
            <LoaderCircle size={18} className="animate-spin" />
            Loading settings...
          </div>
        )}

        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {message && (
          <div role="status" className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
            <CheckCircle2 size={18} />
            {message}
          </div>
        )}

        {profile && (
          <div className="space-y-6">

            <section className={card}>
              <div className="mb-6 flex items-center gap-3">
                <UserRound size={22} className="text-blue-600" />
                <h2 className="text-lg font-semibold">
                  Profile Information
                </h2>
              </div>

              <label htmlFor="admin-name" className="text-sm font-medium">
                Full Name
              </label>

              <input
                id="admin-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                autoComplete="name"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-blue-950"
              />

              <div className="mt-5">
                <p className="text-sm font-medium">
                  Official Email
                </p>

                <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <Mail size={18} className="shrink-0 text-blue-600" />
                  <span className="min-w-0 break-all text-sm">
                    {profile.email}
                  </span>
                </div>
              </div>
              <div className="mt-6 flex justify-end border-t border-slate-200 pt-5 dark:border-slate-700">
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={!validName || !changed || saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={17} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </section>

            <section className={card}>
              <div className="mb-6 flex items-center gap-3">
                <ShieldCheck size={22} className="text-blue-600" />
                <h2 className="text-lg font-semibold">
                  Account Information
                </h2>
              </div>

              <div className="space-y-5 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">
                    Account Role
                  </span>
                  <span className="font-semibold">
                    Super Admin
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">
                    Email Verification
                  </span>
                  <span className="flex items-center gap-2 font-medium">
                    {verified && (
                      <CheckCircle2 size={16} className="text-green-600" />
                    )}
                    {verified ? "Verified" : "Not Verified"}
                  </span>
                </div>
              </div>
            </section>

            <section className={card}>
              <div className="mb-4 flex items-center gap-3">
                <LockKeyhole size={22} className="text-blue-600" />
                <h2 className="text-lg font-semibold">
                  Account Security
                </h2>
              </div>

              <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
                Send a password reset link to your registered email address.
              </p>

              <button
                type="button"
                onClick={resetPassword}
                disabled={resetting}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                {resetting ? "Sending..." : "Send Password Reset Email"}
              </button>
            </section>

            <section className={card}>
              <div className="mb-4 flex items-center gap-3">
                <LogOut size={22} className="text-red-600" />
                <h2 className="text-lg font-semibold">
                  Session Management
                </h2>
              </div>

              <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
                End your current session securely.
              </p>

              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950"
              >
                <LogOut size={17} />
                {loggingOut ? "Logging Out..." : "Log Out"}
              </button>
            </section>

          </div>
        )}
      </div>
    </main>
  );
}




