"use client";


import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  CheckCircle2,
  CalendarDays,
  Mail,
  Pencil,
  ShieldCheck,
  UserRound,
  Building2,
} from "lucide-react";

import { auth } from "@/lib/firebase";
import { getCurrentProfile } from "@/lib/auth-service";
import StudentSidebar from "@/components/student/StudentSidebar";

type Profile = {
  firebase_uid: string;
  email: string;
  full_name: string | null;
  role: string;
  institution_id: number | null;
  institution_name?: string | null;
  created_at?: string;
};

type ProfileResponse = {
  user: Profile;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000";

export default function StudentProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);


  const [message, setMessage] = useState("");
  const [error, setError] = useState("");


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const response =
          (await getCurrentProfile()) as ProfileResponse;

        if (response.user.role !== "student") {
          router.replace("/login");
          return;
        }

        setProfile(response.user);
        setEmailVerified(user.emailVerified);
        setName(response.user.full_name ?? "");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your profile."
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  function clearFeedback() {
    setMessage("");
    setError("");
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

    const cleanName = name.trim();

    if (cleanName.length < 2 || cleanName.length > 80) {
      setError("Name must contain 2 to 80 characters.");
      return;
    }

    setSaving(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Please sign in again.");
      }

      const token = await user.getIdToken();

      const response = await fetch(`${API_URL}/api/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ full_name: cleanName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save profile.");
      }

      setProfile((previous) => ({
        ...data.user,
        institution_name:
          data.user.institution_name ??
          previous?.institution_name ??
          null,
      }));
      setName(data.user.full_name ?? "");
      setMessage("Your profile has been updated.");
      setIsEditing(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save profile."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset() {
    clearFeedback();
    setSendingReset(true);

    try {
      const user = auth.currentUser;

      if (!user?.email) {
        throw new Error("Please sign in again.");
      }

      await sendPasswordResetEmail(auth, user.email);

      setMessage(
        "Password reset link sent successfully. Please check your email inbox."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send password reset email."
      );
    } finally {
      setSendingReset(false);
    }
  }

  const memberSinceDate = profile?.created_at
    ? new Date(profile.created_at)
    : null;

  const memberSince =
    memberSinceDate && !Number.isNaN(memberSinceDate.getTime())
      ? memberSinceDate.toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        })
      : "Not available";

  const fieldClass =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <StudentSidebar />

      <main className="min-h-dvh pt-20 md:ml-64 md:pt-0">
        <div className="mx-auto max-w-5xl px-5 py-8 md:px-10 md:py-12">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400">
              Student Portal
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Profile & Settings
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Manage your personal details and account security.
            </p>
          </div>

          {message && (
            <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
              <CheckCircle2 size={19} />
              {message}
            </div>
          )}

          {error && (
            <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border border-slate-300 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              Loading your profile...
            </div>
          ) : !profile ? (
            <div className="rounded-2xl border border-slate-300 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
              Your profile could not be loaded. Please sign in again.
            </div>
          ) : (
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-300 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-2xl font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {(profile.full_name || profile.email)
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold">
                      {profile.full_name || "PolyMate Student"}
                    </h2>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                      {profile.email}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-700 dark:bg-blue-950 dark:text-blue-300">
    {profile.role.replaceAll("_", " ")}
  </span>

  {emailVerified ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">
      <CheckCircle2 size={14} />
      Email Verified
    </span>
  ) : (
    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
      Email Not Verified
    </span>
  )}
</div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-300 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
  <div className="flex items-center gap-3">
    <UserRound size={21} className="text-blue-600" />

    <h2 className="text-lg font-semibold">
      {isEditing ? "Edit Personal Information" : "Personal Information"}
    </h2>
  </div>

  {!isEditing && (
    <button
      type="button"
      onClick={() => {
        clearFeedback();
        setName(profile.full_name ?? "");
        setIsEditing(true);
      }}
      className="ml-auto inline-flex items-center gap-2 rounded-xl border border-blue-600 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950"
    >
      <Pencil size={16} />
      Edit Profile
    </button>
  )}
</div>

                <div>
  {!isEditing ? (
    <div className="space-y-6">

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

        <div>
          <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
            Full Name
          </p>
          <p className="font-semibold">
            {profile.full_name || "Not provided"}
          </p>
        </div>

        <div>
          <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
            Account Role
          </p>
          <p className="font-semibold">Student</p>
        </div>

        <div className="sm:col-span-2">
          <p className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Mail size={16} /> Email Address
          </p>
          <p className="break-all font-medium">
            {profile.email}
          </p>
        </div>

        <div className="sm:col-span-2">
          <p className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Building2 size={16} /> Institution
          </p>
          <p className="font-semibold">
            {profile.institution_name ||
              (profile.institution_id != null
                ? `Institution #${profile.institution_id}`
                : "Not assigned")}
          </p>
        </div>

        <div className="sm:col-span-2">
          <p className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <CalendarDays size={16} /> Member Since
          </p>

          <p className="font-semibold">
            {memberSince}
          </p>
        </div>

      </div>

      

    </div>
  ) : (
    <form
      onSubmit={handleSave}
      className="max-w-xl space-y-5"
    >

      <div>
        <label
          htmlFor="full-name"
          className="text-sm font-medium"
        >
          Full Name
        </label>

        <input
          id="full-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={fieldClass}
          autoComplete="name"
          minLength={2}
          maxLength={80}
          required
        />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <Mail size={16} /> Email Address
        </label>

        <input
          value={profile.email}
          readOnly
          className={`${fieldClass} cursor-not-allowed opacity-70`}
          aria-label="Email address"
        />

        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Your registered email cannot be edited here.
        </p>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <Building2 size={16} /> Institution
        </label>

        <input
          value={
            profile.institution_name ||
            (profile.institution_id != null
              ? `Institution #${profile.institution_id}`
              : "Not assigned")
          }
          readOnly
          className={`${fieldClass} cursor-not-allowed opacity-70`}
          aria-label="Institution"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">

        <button
          type="button"
          disabled={saving}
          onClick={() => {
            setName(profile.full_name ?? "");
            setIsEditing(false);
            clearFeedback();
          }}
          className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>

      </div>

    </form>
  )}
</div>
              </section>

              <section className="rounded-2xl border border-slate-300 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
  <div className="mb-5 flex items-center gap-3">
    <ShieldCheck size={22} className="text-blue-600" />
    <h2 className="text-lg font-semibold">
      Password & Security
    </h2>
  </div>

  <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
    Reset your password securely using a link sent to your registered email address.
  </p>

  <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
    <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
      Registered Email
    </p>

    <div className="flex items-center gap-2 text-sm font-medium">
      <Mail size={17} className="shrink-0 text-blue-600" />
      <span className="break-all">{profile.email}</span>
    </div>
  </div>

  <button
    type="button"
    onClick={handlePasswordReset}
    disabled={sendingReset}
    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
  >
    <Mail size={18} />
    {sendingReset ? "Sending..." : "Send Password Reset Link"}
  </button>

  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
    Check your inbox and spam folder for the password reset email.
  </p>
</section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}











