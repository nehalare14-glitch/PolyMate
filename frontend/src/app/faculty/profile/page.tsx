"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Save, UserRound, X } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import {
  subscribeSmartSync,
  notifySmartSync,
} from "@/lib/smart-sync";
import { auth } from "@/lib/firebase";

type Profile = {
  full_name?: string | null;
  email?: string | null;
  role?: string;
  faculty_branch?: string | null;
  institution_name?: string | null;
};

const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000").replace(/\/+$/, "");

export default function FacultyProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeSmartSync(auth, async (user) => {
      if (!active) return;

      if (user && (editing || saving)) return;

      setError("");

      if (!user) {
        setProfile(null);
        setName("");
        setEditing(false);
        setLoading(false);
        setError("Please sign in to view your profile.");
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch(`${API}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load profile.");
        if (data.user?.role !== "faculty") throw new Error("Faculty access required.");
        if (!active || auth.currentUser?.uid !== user.uid) return;
        setProfile(data.user);
        setName(data.user.full_name || "");
      } catch (err) {
        if (active && auth.currentUser?.uid === user.uid) {
          setError(err instanceof Error ? err.message : "Unable to load profile.");
        }
      } finally {
        if (active && auth.currentUser?.uid === user.uid) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [editing, saving]);

  async function saveProfile() {
    if (!profile) return;
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setError("Name must contain 2 to 80 characters.");
      return;
    }
    if (trimmedName === (profile.full_name || "").trim()) {
      setMessage("No changes to save.");
      setError("");
      setEditing(false);
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setError("Please sign in again.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = await user.getIdToken(true);
      const response = await fetch(`${API}/api/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ full_name: trimmedName }),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save profile.");
      setProfile((previous) => previous ? { ...previous, full_name: trimmedName } : previous);
      setEditing(false);
      setMessage("Profile updated successfully.");
      notifySmartSync();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function sendResetLink() {
    const user = auth.currentUser;
    if (!user?.email) {
      setError("Please sign in again.");
      return;
    }
    setResettingPassword(true);
    setError("");
    setMessage("");
    try {
      await sendPasswordResetEmail(auth, user.email);
      setMessage("Password reset link sent. Check your registered email inbox.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send password reset email.");
    } finally {
      setResettingPassword(false);
    }
  }

  function cancelEditing() {
    setEditing(false);
    setName(profile?.full_name || "");
    setError("");
  }

  return (
    <main className="mx-auto max-w-4xl pb-12 text-slate-900 dark:text-slate-100">
      <Link href="/faculty/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600">
        <ArrowLeft size={17} /> Back to Dashboard
      </Link>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="mt-2 text-sm text-slate-500">Your faculty account information.</p>
        </div>
        {profile && !editing && (
          <button type="button" onClick={() => { setEditing(true); setError(""); setMessage(""); }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
            <Pencil size={16} /> Edit Profile
          </button>
        )}
      </div>

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900 sm:p-8">
        {loading && <p>Loading profile...</p>}
        {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
        {message && <p role="status" className="mb-4 text-sm text-green-600">{message}</p>}

        {profile && !loading && (
          <>
            <div className="flex items-center gap-4 border-b border-slate-200 pb-6 dark:border-slate-700">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <UserRound size={30} />
              </div>
              <div>
                <h2 className="text-xl font-bold">{profile.full_name || "Faculty Member"}</h2>
                <p className="text-sm text-slate-500">Faculty</p>
              </div>
            </div>

            <div className="mt-7 grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="faculty-name" className="text-sm text-slate-500">Full Name</label>
                {editing ? (
                  <input id="faculty-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                ) : (
                  <p className="mt-1 font-medium">{profile.full_name || "Not provided"}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-500">Email Address</p>
                <p className="mt-1 break-all font-medium">{auth.currentUser?.email || profile.email || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Role</p>
                <p className="mt-1 font-medium">Faculty</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Branch</p>
                <p className="mt-1 font-medium">{profile.faculty_branch || "Not provided"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-slate-500">Institution Name</p>
                <p className="mt-1 font-medium">{profile.institution_name || "Not provided"}</p>
              </div>
            </div>

            {editing ? (
              <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
                <button type="button" onClick={saveProfile} disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                  <Save size={17} /> {saving ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" onClick={cancelEditing} disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium disabled:opacity-50">
                  <X size={17} /> Cancel
                </button>
              </div>
            ) : (
              <div className="mt-8 space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
                <h3 className="text-base font-semibold">Account Actions</h3>
                <button type="button" onClick={sendResetLink} disabled={resettingPassword}
                  className="block w-full rounded-xl border border-slate-300 px-4 py-3 text-left text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  {resettingPassword ? "Sending..." : "Send Password Reset Email"}
                </button>
                <button type="button" onClick={() => setDeleteDialog(true)}
                  className="block w-full rounded-xl border border-red-300 px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                  Delete My Account
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title" aria-describedby="delete-account-description"
            className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-xl dark:bg-slate-900 dark:text-white">
            <h2 id="delete-account-title" className="text-xl font-bold">Delete your PolyMate account?</h2>
            <p id="delete-account-description" className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Account deletion is not yet enabled. This feature requires secure server-side implementation.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteDialog(false)} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm">No</button>
              <button type="button" onClick={() => {
                setDeleteDialog(false);
                setError("Account deletion is not yet enabled. Secure server-side deletion must be configured first.");
              }} className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white">Yes</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
