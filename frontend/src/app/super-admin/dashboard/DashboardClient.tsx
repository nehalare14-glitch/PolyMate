"use client";

import ThemeToggle from "@/components/theme/ThemeToggle";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mail,
  LayoutDashboard,
  ShieldCheck,
  Users,
  GraduationCap,
  Building2,
  FileText,
  ClipboardCheck,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
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
    href: "/super-admin/dashboard",
    icon: LayoutDashboard,
    available: true,
  },
  {
    name: "Manage Admins",
    href: "/super-admin/admins",
    icon: ShieldCheck,
    available: false,
  },
  {
    name: "Students",
    href: "/super-admin/students",
    icon: Users,
    available: false,
  },
  {
    name: "Institutions",
    href: "/super-admin/institutions",
    icon: Building2,
    available: false,
  },
  {
    name: "Study Materials",
    href: "/super-admin/materials",
    icon: FileText,
    available: false,
  },
  {
    name: "Settings",
    href: "/super-admin/settings",
    icon: Settings,
    available: true,
  },
];

const modules = [
  {
    title: "Manage Admins",
    description: "Create and manage institution administrators.",
    icon: ShieldCheck,
    href: "/super-admin/admins",
    available: false,
  },
  {
    title: "Student Management",
    description: "View and manage registered students.",
    icon: GraduationCap,
    href: "/super-admin/students",
    available: false,
  },
  {
    title: "Institutions",
    description: "Manage institutions and college codes.",
    icon: Building2,
    href: "/super-admin/institutions",
    available: false,
  },
  {
    title: "Study Materials",
    description: "Monitor uploaded notes and exam papers.",
    icon: FileText,
    href: "/super-admin/materials",
    available: false,
  },
];

export default function SuperAdminDashboard() {
  const router = useRouter();

  const [name, setName] = useState("Administrator");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          `${API_URL}/api/super-admin/dashboard`,
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6">
          <div>
            <h2 className="text-xl font-bold text-blue-700">
              PolyMate
            </h2>
            <p className="text-xs text-slate-500">
              Super Admin Console
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            aria-label="Close navigation"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="space-y-1 p-4" aria-label="Super Admin navigation">
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
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100"
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

        <div className="absolute bottom-0 w-full border-t border-slate-100 p-4">
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

      <div className="lg:ml-64">
        <header className="flex min-h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-900 md:px-8">
  <div className="flex min-w-0 items-center gap-4">
    <button
      type="button"
      onClick={() => setSidebarOpen(true)}
      className="shrink-0 lg:hidden"
      aria-label="Open navigation"
    >
      <Menu size={24} />
    </button>

    <div className="min-w-0">
      <h1 className="truncate text-lg font-bold dark:text-white md:text-xl">
        Super Admin Dashboard
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
  </div>
</header>

        <main className="mx-auto max-w-7xl space-y-8 p-5 md:p-8">
          <section>
            <h2 className="text-2xl font-bold">
              Welcome, {name}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Manage the PolyMate educational platform.
            </p>
          </section>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={18} />
              Loading account information...
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <section>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">
                Platform Overview
              </h3>
              <p className="text-sm text-slate-500">
                Live statistics will be connected to Supabase.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { title: "Total Students", icon: Users },
                { title: "Faculty Members", icon: GraduationCap },
                { title: "Active Admins", icon: ShieldCheck },
                { title: "Pending Requests", icon: ClipboardCheck },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-slate-200 bg-white p-6"
                  >
                    <Icon className="text-blue-700" size={24} />
                    <p className="mt-5 text-3xl font-bold">—</p>
                    <p className="mt-2 text-sm text-slate-500">
                      {item.title}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">
                Platform Management
              </h3>
              <p className="text-sm text-slate-500">
                Access administrative tools and services.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {modules.map((module) => {
                const Icon = module.icon;

                return (
                  <div
                    key={module.title}
                    className="rounded-2xl border border-slate-200 bg-white p-6"
                  >
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <Icon size={24} />
                    </div>

                    <h4 className="text-lg font-semibold">
                      {module.title}
                    </h4>

                    <p className="mt-2 min-h-12 text-sm text-slate-500">
                      {module.description}
                    </p>

                    {module.available ? (
                      <Link
                        href={module.href}
                        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
                      >
                        Open module
                        <ChevronRight size={16} />
                      </Link>
                    ) : (
                      <p className="mt-5 text-sm text-slate-400">
                        Coming soon
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}











