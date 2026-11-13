"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import {
  UserRound,
  ShieldCheck,
  Mail,
  LockKeyhole,
  Monitor,
  Activity,
  Server,
  Database,
  HardDrive,
  Clock,
  LogOut,
  ChevronRight,
  RefreshCw,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:5000";

type Tab = "account" | "security" | "platform";

type Profile = {
  full_name: string | null;
  email: string;
  role: string;
};

type HealthService = {
  name: string;
  status: "operational" | "unavailable";
  response_ms: number | null;
};

type Health = {
  checked_at: string;
  services: HealthService[];
};

const card =
  "rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-6";

const muted =
  "text-sm text-slate-500 dark:text-slate-400";

const button =
  "rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800";

const primary =
  "rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50";

const field =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800";

const divider =
  "border-t border-slate-100 dark:border-slate-800";

const services = [
  { name: "Flask Backend", label: "Backend", icon: Server },
  { name: "Firebase Authentication", label: "Authentication", icon: ShieldCheck },
  { name: "Supabase Database", label: "Database", icon: Database },
  { name: "Supabase PDF Storage", label: "PDF Storage", icon: HardDrive },
];

async function request(
  path: string,
  method = "GET",
  body?: object
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please log in again.");
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("This service is not available yet.");
    }

    throw new Error(
      data.error || `Request failed (${response.status}).`
    );
  }

  return data;
}

function subscribeToClock(callback: () => void) {
  const timer = window.setInterval(callback, 1000);

  return () => window.clearInterval(timer);
}

function getClockSnapshot() {
  return Math.floor(Date.now() / 1000);
}

function getServerClockSnapshot() {
  return 0;
}

function subscribeToTimeFormat(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(
    "polymate-time-format-change",
    callback
  );

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(
      "polymate-time-format-change",
      callback
    );
  };
}

function getTimeFormat() {
  return localStorage.getItem(
    "polymate-time-format"
  ) === "24" ? "24" : "12";
}

function getServerTimeFormat() {
  return "12";
}

export default function SettingsClient() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("account");

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [name, setName] = useState("");
  const [verified, setVerified] = useState(false);
  const [editing, setEditing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [dialog, setDialog] =
    useState<"logout" | "sessions" | null>(null);

  const [password, setPassword] = useState("");

  const [health, setHealth] =
    useState<Health | null>(null);

  const timestamp = useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    getServerClockSnapshot
  );

  const now = timestamp
    ? new Date(timestamp * 1000)
    : null;

  const format = useSyncExternalStore(
    subscribeToTimeFormat,
    getTimeFormat,
    getServerTimeFormat
  );

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          router.replace("/login");
          return;
        }

        try {
          await user.reload();

          const data = await request("/api/me");

          if (data.user?.role !== "admin") {
            throw new Error("Admin access required.");
          }

          if (!user.emailVerified) {
            throw new Error("Email verification required.");
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
                : "Unable to load settings."
            );
          }
        } finally {
          if (active) setLoading(false);
        }
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);



  function changeFormat(value: string) {
    localStorage.setItem(
      "polymate-time-format",
      value
    );

    window.dispatchEvent(
      new Event("polymate-time-format-change")
    );
  }

  function changeTab(value: Tab) {
    setTab(value);
    setError("");
    setMessage("");
  }

  async function perform(
    action: string,
    operation: () => Promise<void>
  ) {
    if (busy) return;

    setBusy(action);
    setError("");
    setMessage("");

    try {
      await operation();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setBusy("");
    }
  }

  function saveName() {
    const value = name.trim();

    if (value.length < 2 || value.length > 80) {
      setError("Name must contain 2 to 80 characters.");
      return;
    }

    void perform("name", async () => {
      await request("/api/me", "PATCH", {
        full_name: value,
      });

      setProfile((old) =>
        old ? { ...old, full_name: value } : old
      );

      setName(value);
      setEditing(false);
      setMessage("Profile updated successfully.");
    });
  }

  function resetPassword() {
    void perform("password", async () => {

      const user = auth.currentUser;

      if (!user) {
        throw new Error("Please log in again.");
      }

      await user.reload();

      if (!user.email) {
        throw new Error("No registered email address found.");
      }

      if (!user.emailVerified) {
        throw new Error("Please verify your email first.");
      }

      const confirmed = window.confirm(
        `Send a password reset link to ${user.email}?`
      );

      if (!confirmed) return;

      try {
        await sendPasswordResetEmail(
          auth,
          user.email,
          {
            url: `${window.location.origin}/login`,
            handleCodeInApp: false,
          }
        );

        setMessage(
          `Password reset link sent to ${user.email}. ` +
          "Check your inbox and spam folder."
        );

      } catch (err) {

        const error = err as { code?: string };

        switch (error.code) {

          case "auth/too-many-requests":
            throw new Error(
              "Too many requests. Please try again later."
            );

          case "auth/unauthorized-continue-uri":
            throw new Error(
              "Website domain is not authorized in Firebase."
            );

          case "auth/network-request-failed":
            throw new Error(
              "Network error. Check your internet connection."
            );

          case "auth/invalid-email":
            throw new Error(
              "The registered email address is invalid."
            );

          default:
            throw err;
        }
      }
    });
  }

  function checkServices() {
    void perform("health", async () => {
      const data = await request(
        "/api/admin/platform/health"
      );

      setHealth(data);
    });
  }

  function logout() {
    void perform("logout", async () => {
      await signOut(auth);
      router.replace("/login");
    });
  }

  function revokeSessions() {
    void perform("sessions", async () => {
      const user = auth.currentUser;

      if (!user?.email) {
        throw new Error("Please log in again.");
      }

      if (!password) {
        throw new Error("Enter your current password.");
      }

      await reauthenticateWithCredential(
        user,
        EmailAuthProvider.credential(
          user.email,
          password
        )
      );

      await user.getIdToken(true);

      const result = await request(
        "/api/admin/sessions/revoke",
        "POST"
      );

      if (!result.revoked) {
        throw new Error("Unable to revoke sessions.");
      }

      setPassword("");

      await signOut(auth);
      router.replace("/login");
    });
  }

  function closeDialog() {
    if (busy) return;

    setDialog(null);
    setPassword("");
    setError("");
  }

  const displayName =
    profile?.full_name || "PolyMate Admin";

  const time = now
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: format === "12",
      }).format(now)
    : "--:--:--";

  const date = now
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(now)
    : "";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8">

      <div className="mx-auto max-w-3xl space-y-5">

        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            Settings
          </h1>

          <p className={`mt-2 ${muted}`}>
            A little more control over your workspace.
          </p>
        </header>

        {loading && (
          <div className="flex items-center gap-2 py-6 text-sm">
            <LoaderCircle
              size={18}
              className="animate-spin text-blue-600"
            />
            Loading settings...
          </div>
        )}

        {error && !dialog && (
          <div role="alert"
            className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </div>
        )}

        {message && (
          <div role="status"
            className="flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            <CheckCircle2 size={18} className="shrink-0" />
            {message}
          </div>
        )}

        {profile && (
          <>
            {/* Compact profile */}
            <section className={card}>
              <div className="flex items-center gap-4">

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {displayName.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold">
                    {displayName}
                  </h2>

                  <p className={`break-all ${muted}`}>
                    {profile.email}
                  </p>

                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck size={15} />
                    {verified
                      ? "Verified Admin"
                      : "Admin"}
                  </p>
                </div>

              </div>
            </section>

            {/* Tabs */}
            <nav aria-label="Settings sections"
              className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/60 p-1 dark:bg-slate-800">

              {(["account", "security", "platform"] as Tab[])
                .map((item) => (
                  <button
                    key={item}
                    type="button"
                    disabled={!!busy}
                    onClick={() => changeTab(item)}
                    aria-pressed={tab === item}
                    className={`rounded-lg px-2 py-2.5 text-sm font-medium capitalize ${
                      tab === item
                        ? "bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    {item}
                  </button>
                ))}

            </nav>

            {/* Account */}
            {tab === "account" && (
              <section className={card}>

                <h2 className="font-semibold">
                  Personal Details
                </h2>

                <div className="mt-5 flex items-center gap-3">

                  <UserRound
                    size={21}
                    className="shrink-0 text-slate-400"
                  />

                  <div className="min-w-0 flex-1">
                    <p className={muted}>Display Name</p>

                    {editing ? (
                      <input
                        aria-label="Display name"
                        value={name}
                        maxLength={80}
                        onChange={(e) => setName(e.target.value)}
                        className={`mt-2 ${field}`}
                      />
                    ) : (
                      <p className="mt-1 break-words text-sm font-medium">
                        {displayName}
                      </p>
                    )}
                  </div>

                  {!editing && (
                    <button
                      type="button"
                      className={button}
                      onClick={() => setEditing(true)}
                    >
                      Edit
                    </button>
                  )}
                </div>

                {editing && (
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      className={button}
                      disabled={!!busy}
                      onClick={() => {
                        setName(profile.full_name || "");
                        setEditing(false);
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className={primary}
                      disabled={!!busy}
                      onClick={saveName}
                    >
                      {busy === "name" ? "Saving..." : "Save"}
                    </button>
                  </div>
                )}

                <div className={`my-5 ${divider}`} />

                <div className="flex items-center gap-3">
                  <Mail
                    size={21}
                    className="shrink-0 text-slate-400"
                  />

                  <div className="min-w-0 flex-1">
                    <p className={muted}>Email Address</p>

                    <p className="mt-1 break-all text-sm font-medium">
                      {profile.email}
                    </p>
                  </div>

                  <LockKeyhole
                    size={17}
                    className="shrink-0 text-slate-400"
                  />
                </div>

              </section>
            )}

            {/* Security */}
            {tab === "security" && (
              <section className={card}>

                <div className="flex items-center gap-3">
                  <ShieldCheck
                    size={24}
                    className="text-emerald-600"
                  />

                  <div>
                    <h2 className="font-semibold">
                      Account Protection
                    </h2>

                    <p className={muted}>
                      Manage your account security.
                    </p>
                  </div>
                </div>

                <div className={`my-5 ${divider}`} />

                <div className="flex items-center gap-3">
                  <LockKeyhole
                    size={20}
                    className="shrink-0 text-slate-400"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      Password
                    </p>

                    <p className={muted}>
                      Reset your password by email.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={!!busy}
                    className={button}
                    onClick={resetPassword}
                  >
                    {busy === "password"
                      ? "Sending..."
                      : "Change"}
                  </button>
                </div>

                <div className={`my-5 ${divider}`} />

                <div className="flex items-center gap-3">
                  <Monitor
                    size={20}
                    className="shrink-0 text-slate-400"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      Login Sessions
                    </p>

                    <p className={muted}>
                      Secure access on all devices.
                    </p>
                  </div>

                  <button
                    type="button"
                    className={button}
                    disabled={!!busy}
                    onClick={() => {
                      setError("");
                      setDialog("sessions");
                    }}
                  >
                    Manage
                  </button>
                </div>

              </section>
            )}

            {/* Platform */}
            {tab === "platform" && (
              <>

                <section className={card}>
                  <div className="flex items-center gap-3">
                    <Activity
                      size={24}
                      className="text-blue-600"
                    />

                    <div>
                      <h2 className="font-semibold">
                        System Health
                      </h2>

                      <p className={muted}>
                        Check essential PolyMate services.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">

                    {services.map(({ name, label, icon: Icon }) => {

                      const result = health?.services.find(
                        (item) => item.name === name
                      );

                      return (
                        <div
                          key={name}
                          className="flex items-center gap-3 py-4"
                        >
                          <Icon
                            size={20}
                            className="text-slate-400"
                          />

                          <span className="flex-1 text-sm font-medium">
                            {label}
                          </span>

                          <span className={`text-xs font-medium ${
                            result?.status === "operational"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : result?.status === "unavailable"
                              ? "text-red-600 dark:text-red-400"
                              : "text-slate-400"
                          }`}>
                            {busy === "health"
                              ? "Checking..."
                              : result?.status === "operational"
                              ? "Operational"
                              : result?.status === "unavailable"
                              ? "Unavailable"
                              : "Not checked"}
                          </span>
                        </div>
                      );
                    })}

                  </div>

                  {health && (
                    <p className="mb-4 text-xs text-slate-500">
                      Last check:{" "}
                      {new Intl.DateTimeFormat("en-IN", {
                        timeZone: "Asia/Kolkata",
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(health.checked_at))}
                      {" "}IST
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={checkServices}
                    className={`${button} flex w-full items-center justify-center gap-2`}
                  >
                    <RefreshCw
                      size={16}
                      className={busy === "health"
                        ? "animate-spin"
                        : ""}
                    />

                    {busy === "health"
                      ? "Checking Services..."
                      : "Check Services"}
                  </button>

                </section>

                <section className={card}>
                  <h2 className="font-semibold">
                    Date &amp; Time
                  </h2>

                  <div className="mt-4 flex items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">

                    <Clock
                      size={28}
                      className="shrink-0 text-blue-600"
                    />

                    <div>
                      <p className="text-2xl font-bold tabular-nums">
                        {time}
                      </p>

                      <p className={`mt-1 ${muted}`}>
                        {date}
                      </p>

                      <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                        India Standard Time
                      </p>
                    </div>

                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">

                    {["12", "24"].map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={format === value}
                        onClick={() => changeFormat(value)}
                        className={`rounded-xl border px-3 py-2.5 text-sm ${
                          format === value
                            ? "border-blue-600 bg-blue-50 font-semibold text-blue-600 dark:bg-blue-950 dark:text-blue-300"
                            : "border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {value}-hour
                      </button>
                    ))}

                  </div>
                </section>

              </>
            )}

            {/* Log Out */}
            <button
              type="button"
              disabled={!!busy}
              onClick={() => {
                setError("");
                setDialog("logout");
              }}
              className={`${card} flex w-full items-center gap-3 text-left hover:border-red-200`}
            >
              <LogOut size={21} className="text-red-600" />

              <div className="flex-1">
                <p className="text-sm font-semibold text-red-600">
                  Log Out
                </p>

                <p className={muted}>
                  End your current session.
                </p>
              </div>

              <ChevronRight
                size={18}
                className="text-slate-400"
              />
            </button>

            <footer className="py-2 text-center text-xs text-slate-400">
              PolyMate &middot; Admin Workspace
            </footer>

          </>
        )}

      </div>

      {/* Confirmation dialog */}
      {dialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
          >

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950">
              <LogOut size={23} />
            </div>

            <h2 id="dialog-title"
              className="text-lg font-bold">
              {dialog === "logout"
                ? "Log Out of PolyMate?"
                : "Log Out All Devices?"}
            </h2>

            <p className={`mt-2 ${muted}`}>
              {dialog === "logout"
                ? "You can log in again anytime."
                : "All Admin sessions, including this device, will be revoked. Confirm with your current password."}
            </p>

            {dialog === "sessions" && (
              <div className="mt-4">
                <label htmlFor="session-password"
                  className="text-sm font-medium">
                  Current Password
                </label>

                <input
                  id="session-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`mt-2 ${field}`}
                />
              </div>
            )}

            {error && (
              <p role="alert"
                className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">

              <button
                type="button"
                className={button}
                disabled={!!busy}
                onClick={closeDialog}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!!busy}
                onClick={
                  dialog === "logout"
                    ? logout
                    : revokeSessions
                }
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy
                  ? "Please wait..."
                  : dialog === "logout"
                  ? "Log Out"
                  : "Log Out All Devices"}
              </button>

            </div>

          </section>

        </div>
      )}

    </div>
  );
}
