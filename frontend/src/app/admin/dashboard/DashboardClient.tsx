"use client";

import NotificationBell from "@/components/notifications/NotificationBell";
import ThemeToggle from "@/components/theme/ThemeToggle";
import AdminOverview from "./AdminOverview";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mail,
  LayoutDashboard,
  Users,
  GraduationCap,
  Building2,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000";

const navigation = [
  {
    name: "Overview",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    available: true,
  },

  {
    name: "Students",
    href: "/admin/students",
    icon: Users,
    available: true,
  },
  {
    name: "Faculty",
    href: "/admin/faculty",
    icon: GraduationCap,
    available: true,
  },
  {
    name: "Institutions",
    href: "/admin/institutions",
    icon: Building2,
    available: true,
  },
  {
    name: "Study Materials",
    href: "/admin/materials",
    icon: FileText,
    available: true,
  },
  {
    name: "Community Management",
    href: "/admin/community",
    icon: MessageSquare,
    available: true,
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
    available: true,
  },
];



export default function AdminDashboard() {
  const router = useRouter();

  const [name, setName] = useState("Administrator");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;

    const media = window.matchMedia("(min-width: 1024px)");
    if (media.matches) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    }

    function handleResize(event: MediaQueryListEvent) {
      if (event.matches) {
        setSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleKey);
    media.addEventListener("change", handleResize);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
      media.removeEventListener("change", handleResize);
    };
  }, [sidebarOpen]);


  useEffect(() => {
    let active = true;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        if (active) setLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();

        const response = await fetch(
          `${API_URL}/api/admin/dashboard`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Access denied");
        }

        if (active) {
          setName(data.user?.full_name || "Administrator");
          setEmail(user.email || "");
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load dashboard"
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
  }, []);

  async function handleLogout() {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch {
      setError("Unable to sign out. Please try again.");
    }
  }

  return (
    <div className="min-h-dvh bg-[#F6F8FC] text-slate-900 dark:bg-[#0B1220] dark:text-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col overflow-hidden border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-transform lg:visible lg:translate-x-0 ${
          sidebarOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-100 px-6 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-blue-700 dark:text-blue-400">
              PolyMate
            </h2>
            <p className="text-xs text-slate-500">
              Admin Console
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="flex min-h-11 min-w-11 items-center justify-center lg:hidden"
            aria-label="Close navigation"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-4" aria-label="Admin navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            const content = (
              <>
                <Icon size={19} />
                <span className="flex-1">{item.name}</span>
                {!item.available && (
                  <span className="text-[10px] text-slate-400">
                    Soon
                  </span>
                )}
              </>
            );

            return item.available ? (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  item.name === "Overview"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {content}
              </Link>
            ) : (
              <div
                key={item.name}
                aria-disabled="true"
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400"
              >
                {content}
              </div>
            );
          })}
        </nav>

        <div className="w-full shrink-0 border-t border-slate-100 p-4 dark:border-slate-800">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut size={19} />
            Log Out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <div className="min-w-0 lg:ml-64">
        <header className="flex min-h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-900 md:px-8">
  <div className="flex min-w-0 items-center gap-4">
    <button
      type="button"
      onClick={() => setSidebarOpen(true)}
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center lg:hidden"
      aria-label="Open navigation" aria-expanded={sidebarOpen}
    >
      <Menu size={24} />
    </button>

    <div className="min-w-0">
      <h1 className="truncate text-lg font-bold dark:text-white md:text-xl">
        Admin Dashboard
      </h1>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Platform administration
      </p>
    </div>
  </div>

  <div className="flex shrink-0 items-center gap-4">
    <div className="hidden min-w-0 max-w-[300px] flex-col items-end gap-1 lg:flex">
      <p className="w-full truncate text-right text-sm font-semibold dark:text-white">
        {name}
      </p>

      <div className="flex w-full items-center justify-end gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Mail size={15} className="shrink-0 text-blue-600" />
        <span className="min-w-0 truncate">{email}</span>
      </div>
    </div>

    <ThemeToggle />
    <NotificationBell role="admin" />
  </div>
</header>

        <main className="mx-auto min-w-0 max-w-[1600px] space-y-6 p-4 md:p-8">

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center gap-3 text-sm text-slate-500">
              <Loader2 size={20} className="animate-spin" />
              Loading Admin Dashboard...
            </div>
          ) : !error ? (
            <AdminOverview name={name} />
          ) : null}

        </main>
      </div>
    </div>
  );
}

