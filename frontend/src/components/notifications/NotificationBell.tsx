"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Check, X, RefreshCw } from "lucide-react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

const API = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:5000"
).replace(/\/$/, "");

type Notification = {
  id: string;
  request_id: string | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type AdminSummary = {
  new_requests: number;
  unread_messages: number;
  unread_tickets: number;
};

function NotificationBellContent({
  role,
}: {
  role: "student" | "admin";
}) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setItems([]);
      setUnread(0);
      setSummary(null);
      setOpen(false);
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      const token = await user.getIdToken();

      const endpoint =
        role === "student"
          ? "/api/student/community/notifications?limit=100"
          : "/api/admin/community/unread-summary";

      const response = await fetch(`${API}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load notifications");
      }

      const data = await response.json();

      if (auth.currentUser?.uid !== user.uid) return;

      if (role === "student") {
        setItems(data.notifications || []);
        setUnread(data.unread_count || 0);
      } else {
        setSummary(data);
        setUnread(
          (data.new_requests || 0) +
          (data.unread_tickets || 0)
        );
      }
    } catch {
      setError("Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    if (!user) return;

    void refresh();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, 30000);

    const onFocus = () => void refresh();

    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, refresh]);

  async function markRead(id: string) {
    if (!user) return false;

    try {
      const token = await user.getIdToken();

      const response = await fetch(
        `${API}/api/student/community/notifications/${id}/read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Update failed");
      }

      await refresh();
      return true;
    } catch {
      setError("Unable to update notification.");
      return false;
    }
  }

  async function markAllRead() {
    if (!user) return;

    setError("");

    try {
      const token = await user.getIdToken();

      const response = await fetch(
        `${API}/api/student/community/notifications/read-all`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Update failed");
      }

      await refresh();
    } catch {
      setError("Unable to mark all notifications as read.");
    }
  }

  async function openNotification(item: Notification) {
    if (!item.is_read) {
      const success = await markRead(item.id);
      if (!success) return;
    }

    setOpen(false);
    router.push("/student/community");
  }

  function openCommunity() {
    setOpen(false);
    router.push(`/${role}/community`);
  }

  if (!user) return null;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (!open) void refresh();
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        <Bell size={20} />

        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />

          <section
            className="fixed inset-x-4 top-[72px] z-50 md:absolute md:inset-x-auto md:right-0 md:top-12 md:w-[350px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
            aria-label="Notifications"
          >
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">
                  Notifications
                </h2>
                <p className="text-xs text-slate-500">
                  {unread} unread
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Refresh notifications"
                  onClick={() => void refresh()}
                  disabled={loading}
                  className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <RefreshCw
                    size={16}
                    className={loading ? "animate-spin" : ""}
                  />
                </button>

                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            {error && (
              <p className="p-4 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="max-h-[60vh] overflow-y-auto">
              {role === "student" && (
                <>
                  {!loading && items.length === 0 && !error && (
                    <div className="p-8 text-center text-sm text-slate-500">
                      <Bell className="mx-auto mb-3" size={28} />
                      No notifications yet.
                    </div>
                  )}

                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-2 border-b border-slate-100 p-4 dark:border-slate-800 ${
                        !item.is_read
                          ? "bg-blue-50/70 dark:bg-blue-950/30"
                          : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => void openNotification(item)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {item.title}
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                          {item.message}
                        </p>

                        <p className="mt-2 text-[11px] text-slate-500">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      </button>

                      {!item.is_read && (
                        <button
                          type="button"
                          aria-label="Mark as read"
                          onClick={() => void markRead(item.id)}
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-slate-800"
                        >
                          <Check size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}

              {role === "admin" && summary && (
                <div className="space-y-3 p-4 text-sm">
                  <button
                    type="button"
                    onClick={openCommunity}
                    className="w-full rounded-xl bg-blue-50 p-3 text-left dark:bg-slate-800"
                  >
                    New requests: {summary.new_requests || 0}
                  </button>

                  <button
                    type="button"
                    onClick={openCommunity}
                    className="w-full rounded-xl bg-blue-50 p-3 text-left dark:bg-slate-800"
                  >
                    Unread messages: {summary.unread_messages || 0}
                  </button>
                </div>
              )}

              {loading && items.length === 0 && !summary && (
                <p className="p-4 text-center text-sm text-slate-500">
                  Loading notifications...
                </p>
              )}
            </div>

            <footer className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-700">
              {role === "student" && unread > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="w-full rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-slate-800"
                >
                  Mark all as read
                </button>
              )}
              <button
                type="button"
                onClick={openCommunity}
                className="w-full rounded-xl bg-[#1746a2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Open Community Hub
              </button>
            </footer>
          </section>
        </>
      )}
    </div>
  );
}




export default function NotificationBell({
  role,
  viewport = "all",
}: {
  role: "student" | "admin";
  viewport?: "all" | "mobile" | "desktop";
}) {
  const [enabled, setEnabled] = useState(
    viewport === "all"
  );

  useEffect(() => {
    if (viewport === "all") {
      setEnabled(true);
      return;
    }

    const media = window.matchMedia(
      "(min-width: 768px)"
    );

    const update = () => {
      setEnabled(
        viewport === "desktop"
          ? media.matches
          : !media.matches
      );
    };

    update();

    media.addEventListener("change", update);

    return () => {
      media.removeEventListener("change", update);
    };
  }, [viewport]);

  if (!enabled) return null;

  return <NotificationBellContent role={role} />;
}
