"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  Building2,
  FileText,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  Database,
  CalendarDays,
  BookOpen,
} from "lucide-react";

import { auth } from "@/lib/firebase";

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:5000";

type Analytics = {
  stats: {
    students: number;
    faculty: number;
    institutions: number;
    materials: number;
    pending_faculty: number;
    published_materials: number;
  };
  growth: {
    date: string;
    label: string;
    count: number;
  }[];
  branches: {
    name: string;
    count: number;
  }[];
  activity: {
    type: string;
    title: string;
    description: string;
    created_at: string;
  }[];
  updated_at: string;
};

type Health = {
  overall_status: string;
  operational_count: number;
  total_services: number;
  checked_at: string;
  services: {
    name: string;
    status: string;
    response_ms: number | null;
  }[];
};

const panel =
  "rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900";

const muted =
  "text-sm text-slate-500 dark:text-slate-400";

function formatNumber(value: number | undefined) {
  return value === undefined
    ? "--"
    : value.toLocaleString("en-IN");
}

function formatDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export default function AdminOverview({
  name,
}: {
  name: string;
}) {
  const [analytics, setAnalytics] =
    useState<Analytics | null>(null);

  const [health, setHealth] =
    useState<Health | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [healthError, setHealthError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [period, setPeriod] = useState<7 | 30>(7);

  useEffect(() => {
    let active = true;

    const unsubscribe = auth.onAuthStateChanged(
      async user => {

        if (!user) {
          if (active) setLoading(false);
          return;
        }

        if (active) {
          setLoading(true);
          setError("");
          setHealthError("");
        }

        try {
          const token = await user.getIdToken();

          async function request(path: string) {
            const response = await fetch(
              `${API}${path}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
              }
            );

            const data = await response.json();

            if (!response.ok) {
              throw new Error(
                data.error || "Request failed."
              );
            }

            return data;
          }

          const results = await Promise.allSettled([
            request("/api/admin/analytics"),
            request("/api/admin/platform/health"),
          ]);

          if (!active) return;

          if (results[0].status === "fulfilled") {
            setAnalytics(results[0].value);
          } else {
            setError(
              "Unable to load platform analytics."
            );
          }

          if (results[1].status === "fulfilled") {
            setHealth(results[1].value);
          } else {
            setHealthError(
              "Unable to check system health."
            );
          }

        } catch {
          if (active) {
            setError("Unable to load dashboard.");
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
  }, [refresh]);

  const stats = analytics?.stats;

  const growth =
    analytics?.growth.slice(-period) || [];

  const growthTotal = growth.reduce(
    (sum, item) => sum + item.count,
    0
  );

  const maxGrowth = Math.max(
    1,
    ...growth.map(item => item.count)
  );

  const maxBranch = Math.max(
    1,
    ...(analytics?.branches.map(
      item => item.count
    ) || [])
  );

  const cards = [
    {
      title: "Total Students",
      value: stats?.students,
      icon: Users,
      href: "/admin/students",
      color:
        "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
      description: "Registered students",
    },
    {
      title: "Faculty Members",
      value: stats?.faculty,
      icon: GraduationCap,
      color:
        "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
      description: "Faculty accounts",
    },
    {
      title: "Institutions",
      value: stats?.institutions,
      icon: Building2,
      href: "/admin/institutions",
      color:
        "bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400",
      description: "Telangana colleges",
    },
    {
      title: "Study Materials",
      value: stats?.materials,
      icon: FileText,
      href: "/admin/materials",
      color:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
      description: "Academic resources",
    },
  ];

  return (
    <div className="space-y-6">

      {/* WELCOME BANNER */}

      <section className="rounded-2xl bg-[#172554] p-6 text-white md:p-8">

        <div className="flex flex-wrap items-start justify-between gap-5">

          <div>
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-200">
              <ShieldCheck size={17} />
              PolyMate Control Center
            </div>

            <h2 className="text-2xl font-bold md:text-3xl">
              Welcome, {name}
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
              Monitor your academic community,
              manage resources and maintain a
              reliable learning platform.
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => setRefresh(v => v + 1)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 text-sm font-medium hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            {loading ? "Loading..." : "Refresh"}
          </button>

        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-white/15 pt-4 text-xs text-blue-100">

          <span className="flex items-center gap-2">
            <CalendarDays size={15} />
            {formatDate(new Date().toISOString())}
          </span>

          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${
              health?.overall_status === "operational"
                ? "bg-green-400"
                : health?.overall_status === "degraded"
                  ? "bg-amber-400"
                  : "bg-slate-400"
            }`} />

            {healthError
              ? "Health check unavailable"
              : health?.overall_status === "operational"
                ? "All services responding"
                : health?.overall_status === "degraded"
                  ? "Some services unavailable"
                  : "Checking system health"}
          </span>

        </div>

      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* STATISTICS */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {cards.map(card => {
          const Icon = card.icon;

          const content = (
            <>
              <div className="flex items-center justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.color}`}>
                  <Icon size={22} />
                </div>

                {card.href && (
                  <ArrowUpRight
                    size={18}
                    className="text-slate-400"
                  />
                )}
              </div>

              <p className="mt-5 text-3xl font-bold tabular-nums">
                {formatNumber(card.value)}
              </p>

              <h3 className="mt-1 text-sm font-semibold">
                {card.title}
              </h3>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {card.description}
              </p>
            </>
          );

          return card.href ? (
            <Link
              key={card.title}
              href={card.href}
              className={`${panel} hover:border-blue-400 dark:hover:border-blue-700`}
            >
              {content}
            </Link>
          ) : (
            <div key={card.title} className={panel}>
              {content}
            </div>
          );
        })}

      </section>

      {/* GROWTH AND ACTION CENTER */}

      <section className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">

        <div className={panel}>

          <div className="flex flex-wrap items-center justify-between gap-3">

            <div>
              <h3 className="font-semibold">
                Student Growth
              </h3>

              <p className={muted}>
                Registrations over time
              </p>
            </div>

            <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">

              {([7, 30] as const).map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriod(value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    period === value
                      ? "bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {value} Days
                </button>
              ))}

            </div>

          </div>

          <div className="mt-5">
            <span className="text-3xl font-bold">
              {analytics ? growthTotal : "--"}
            </span>

            <span className="ml-2 text-sm text-slate-500">
              new registrations
            </span>
          </div>

          {growth.length > 0 ? (

            <div className="mt-6">

              <div className="flex h-44 items-end gap-1 border-b border-slate-200 dark:border-slate-700 sm:gap-2">

                {growth.map(day => (
                  <div
                    key={day.date}
                    className="flex h-full min-w-0 flex-1 items-end"
                    title={`${day.label}: ${day.count} registrations`}
                  >
                    <div
                      className="w-full rounded-t-md bg-blue-500 hover:bg-blue-600"
                      style={{
                        height: `${
                          day.count === 0
                            ? 2
                            : day.count / maxGrowth * 100
                        }%`,
                      }}
                    />
                  </div>
                ))}

              </div>

              <div className="mt-3 flex justify-between text-[10px] text-slate-500">

                {growth
                  .filter((_, index) =>
                    period === 7 ||
                    index % 5 === 0 ||
                    index === growth.length - 1
                  )
                  .map(day => (
                    <span key={day.date}>
                      {day.label}
                    </span>
                  ))}

              </div>

            </div>

          ) : (
            <div className="flex h-44 items-center justify-center text-sm text-slate-400">
              {loading
                ? "Loading registrations..."
                : "Registration data unavailable"}
            </div>
          )}

        </div>

        <div className={panel}>

          <h3 className="font-semibold">
            Action Center
          </h3>

          <p className={muted}>
            Important platform information
          </p>

          <div className="mt-5 space-y-3">

            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">

              <Clock
                size={22}
                className="shrink-0 text-amber-600"
              />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  Pending Faculty Approvals
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Applications awaiting review
                </p>
              </div>

              <span className="text-xl font-bold text-amber-600">
                {formatNumber(stats?.pending_faculty)}
              </span>

            </div>

            <Link
              href="/admin/materials"
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:border-blue-400 dark:border-slate-700"
            >
              <BookOpen
                size={22}
                className="shrink-0 text-blue-600"
              />

              <div className="flex-1">
                <p className="text-sm font-medium">
                  Published Materials
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Available to students
                </p>
              </div>

              <span className="font-bold">
                {formatNumber(stats?.published_materials)}
              </span>
            </Link>

            <Link
              href="/admin/students"
              className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-sm font-medium hover:border-blue-400 dark:border-slate-700"
            >
              Manage Students
              <ArrowUpRight
                size={17}
                className="text-blue-600"
              />
            </Link>

          </div>

        </div>

      </section>

      {/* BRANCH DISTRIBUTION AND HEALTH */}

      <section className="grid gap-5 xl:grid-cols-2">

        <div className={panel}>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                Branch Analytics
              </h3>

              <p className={muted}>
                Study materials by branch
              </p>
            </div>

            <Activity
              size={21}
              className="text-blue-600"
            />
          </div>

          <div className="mt-5 space-y-4">

            {analytics?.branches.map(branch => (
              <div key={branch.name}>

                <div className="mb-2 flex justify-between text-sm">
                  <span>{branch.name}</span>
                  <span className="font-semibold">
                    {branch.count}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${
                        branch.count / maxBranch * 100
                      }%`,
                    }}
                  />
                </div>

              </div>
            ))}

            {!analytics?.branches.length && (
              <p className={muted}>
                {loading
                  ? "Loading branches..."
                  : analytics
                    ? "No materials uploaded yet."
                    : "Branch data unavailable."}
              </p>
            )}

          </div>

        </div>

        <div className={panel}>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                System Health
              </h3>

              <p className={muted}>
                Live service connectivity
              </p>
            </div>

            <Database
              size={21}
              className="text-blue-600"
            />
          </div>

          <div className="mt-4 space-y-1">

            {health?.services.map(service => (
              <div
                key={service.name}
                className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800"
              >

                {service.status === "operational" ? (
                  <CheckCircle2
                    size={19}
                    className="shrink-0 text-emerald-500"
                  />
                ) : (
                  <AlertCircle
                    size={19}
                    className="shrink-0 text-red-500"
                  />
                )}

                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {service.name}
                  </p>

                  <p className="text-xs capitalize text-slate-500">
                    {service.status}
                  </p>
                </div>

                {service.response_ms !== null && (
                  <span className="text-xs tabular-nums text-slate-500">
                    {service.response_ms} ms
                  </span>
                )}

              </div>
            ))}

            {healthError && (
              <p className="py-4 text-sm text-red-600">
                {healthError}
              </p>
            )}

            {!health && !healthError && (
              <p className="py-4 text-sm text-slate-500">
                Checking services...
              </p>
            )}

          </div>

          {health && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800">
              {health.operational_count} of{" "}
              {health.total_services} services responding.
            </div>
          )}

        </div>

      </section>

      {/* RECENT ACTIVITY */}

      <section className={panel}>

        <h3 className="font-semibold">
          Recent Activity
        </h3>

        <p className={muted}>
          Latest student registrations and material uploads
        </p>

        <div className="mt-4">

          {analytics?.activity.map((item, index) => {

            const Icon =
              item.type === "student"
                ? Users
                : FileText;

            return (
              <div
                key={`${item.type}-${index}`}
                className="flex items-center gap-3 border-b border-slate-100 py-4 last:border-0 dark:border-slate-800"
              >

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <Icon size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.title}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {item.description}
                  </p>
                </div>

                <span className="shrink-0 text-xs text-slate-500">
                  {formatDate(item.created_at)}
                </span>

              </div>
            );
          })}

          {!analytics?.activity.length && (
            <p className="py-6 text-center text-sm text-slate-500">
              {loading
                ? "Loading activity..."
                : analytics
                  ? "No recent activity."
                  : "Activity data unavailable."}
            </p>
          )}

        </div>

      </section>

      {analytics && (
        <p className="text-center text-xs text-slate-400">
          Last updated:{" "}
          {new Date(
            analytics.updated_at
          ).toLocaleString("en-IN")}
        </p>
      )}

    </div>
  );
}
