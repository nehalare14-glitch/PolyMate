"use client";

import { fetchSecurePDF, PDF_API_BASE } from "@/lib/secure-pdf";

import PDFViewer from "@/components/shared/PDFViewerDynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { subscribeSmartSync } from "@/lib/smart-sync";
import {
  BookOpen,
  FolderOpen,
  Plus,
  FileText,
  ChevronRight,
  ArrowUpRight,
  Loader2,
  X,
  Eye,
} from "lucide-react";

import { auth } from "@/lib/firebase";

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:5000";

type Material = {
  id: string;
  title: string;
  branch: string;
  semester: number;
  subject_name: string;
  material_type: string;
  created_at: string;
};

type Profile = {
  name?: string;
  full_name?: string;
  faculty_branch?: string;
};

const branchNames: Record<string, string> = {
  CSE: "Computer Science Engineering",
  ECE: "Electronics and Communication Engineering",
  EEE: "Electrical and Electronics Engineering",
  MEC: "Mechanical Engineering",
  CIVIL: "Civil Engineering",
  AIML: "Artificial Intelligence and Machine Learning",
  CCP: "Commercial and Computer Practice",
};

const materialTypes: Record<string, string> = {
  notes: "Subject Notes",
  "question-paper": "Question Paper",
  syllabus: "Syllabus",
  "lab-manual": "Lab Manual",
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";

  return "Good Evening";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const yesterday = new Date();

  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function FacultyDashboardPage() {
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const [greeting, setGreeting] = useState("Hello");
  const [dateLabel, setDateLabel] = useState("");

  const [preview, setPreview] = useState<{
    title: string;
    url: string;
  } | null>(null);

  const [previewLoading, setPreviewLoading] =
    useState<string | null>(null);

  const [previewError, setPreviewError] = useState("");

  // Dynamic greeting and current date
  useEffect(() => {
    function updateClock() {
      setGreeting(getGreeting());

      setDateLabel(
        new Date().toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      );
    }

    updateClock();

    const timer = window.setInterval(updateClock, 60000);

    return () => window.clearInterval(timer);
  }, []);

  // Load faculty profile and uploaded materials
  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeSmartSync(
      auth,
      async (user, initial) => {
        if (!active) return;

        if (initial) {
          setLoading(true);
          setName("");
          setBranch("");
          setMaterials([]);
        }

        setError("");

        if (!user) {
          setError("Please sign in again.");
          setLoading(false);
          return;
        }

        try {
          const token = await user.getIdToken();

          const options: RequestInit = {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          };

          const [profileResponse, materialsResponse] =
            await Promise.all([
              fetch(`${API}/api/me`, options),
              fetch(
                `${API}/api/faculty/materials`,
                options
              ),
            ]);

          const profileData = await profileResponse.json();

          if (!profileResponse.ok) {
            throw new Error(
              profileData.error ||
              "Unable to load your profile."
            );
          }

          const profile: Profile =
            profileData.user ??
            profileData.profile ??
            profileData;

          if (active && auth.currentUser?.uid === user.uid) {
            setName(
              profile.name ||
              profile.full_name ||
              user.displayName ||
              ""
            );

            setBranch(
              (profile.faculty_branch || "")
                .trim()
                .toUpperCase()
            );
          }

          const materialsData =
            await materialsResponse.json();

          if (!materialsResponse.ok) {
            throw new Error(
              materialsData.error ||
              "Unable to load recent materials."
            );
          }

          if (active && auth.currentUser?.uid === user.uid) {
            const items: Material[] =
              Array.isArray(materialsData.materials)
                ? materialsData.materials
                : [];

            setMaterials(
              [...items]
                .sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                )
                .slice(0, 3)
            );
          }
        } catch (err) {
          if (active && auth.currentUser?.uid === user.uid) {
            setError(
              err instanceof Error
                ? err.message
                : "Unable to load dashboard."
            );
          }
        } finally {
          if (active && auth.currentUser?.uid === user.uid) {
            setLoading(false);
          }
        }
      },
      { intervalMs: 30000 }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [retry]);

  // Open actual uploaded PDF
  async function viewPdf(material: Material) {
    setPreviewError("");
    setPreviewLoading(material.id);

    try {
      const result = await fetchSecurePDF(
        `/api/faculty/materials/${encodeURIComponent(material.id)}/preview`,
        material.title,
        PDF_API_BASE
      );

      setPreview(result);
    } catch (err) {
      setPreviewError(
        err instanceof Error
          ? err.message
          : "Unable to open PDF."
      );
    } finally {
      setPreviewLoading(null);
    }
  }

  // Close preview using Escape
  useEffect(() => {
    if (!preview) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreview(null);
      }
    };

    window.addEventListener("keydown", handler);

    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [preview]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7">

      {/* Dashboard heading */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Dashboard
        </h1>

        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle />
          {name && (
          <Link
            href="/faculty/profile"
            aria-label="Open your profile"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          >
            {name.charAt(0).toUpperCase()}
          </Link>
        )}
        </div>
      </header>

      {/* Personalized greeting banner */}
      <section className="relative overflow-hidden rounded-2xl bg-[#1E40AF] px-6 py-7 text-white sm:px-8 sm:py-9">

        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-blue-500/20" />

        <div className="pointer-events-none absolute -bottom-28 right-20 h-64 w-64 rounded-full bg-blue-400/10" />

        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">

            <p className="text-sm font-medium text-blue-200">
              {dateLabel}
            </p>

            <h2 className="mt-3 break-words text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">
              {greeting}
              {name ? `, ${name}!` : "!"}
            </h2>

            {branch && (
              <p className="mt-3 text-sm text-blue-100 sm:text-base">
                {branchNames[branch] || branch}
              </p>
            )}

            <Link
              href="/faculty/upload"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              <Plus size={19} />
              Upload PDF
            </Link>
          </div>

          {/* Academic illustration */}
          <svg
            viewBox="0 0 180 180"
            aria-hidden="true"
            className="hidden h-36 w-36 shrink-0 sm:block lg:h-44 lg:w-44"
          >
            <circle
              cx="90"
              cy="90"
              r="72"
              fill="#3B82F6"
              opacity=".55"
            />

            <circle
              cx="90"
              cy="90"
              r="59"
              fill="none"
              stroke="#93C5FD"
              strokeDasharray="5 8"
              opacity=".6"
            />

            <rect
              x="43"
              y="39"
              width="67"
              height="91"
              rx="9"
              fill="#BFDBFE"
              transform="rotate(-12 76 84)"
            />

            <rect
              x="66"
              y="35"
              width="69"
              height="96"
              rx="9"
              fill="#FFFFFF"
              transform="rotate(9 100 83)"
            />

            <path
              d="M80 58 L120 64 M78 72 L118 78 M76 86 L110 91"
              stroke="#93C5FD"
              strokeWidth="5"
              strokeLinecap="round"
            />

            <circle
              cx="130"
              cy="125"
              r="25"
              fill="#60A5FA"
              stroke="#1E40AF"
              strokeWidth="4"
            />

            <path
              d="M119 125 L127 133 L141 116"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <path
              d="M28 27 V45 M19 36 H37 M145 18 V36 M136 27 H154"
              stroke="#BFDBFE"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </section>

      {/* Workspace navigation */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Your Workspace
        </h2>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#17243B]">

          <Link
            href="/faculty/subjects"
            className="group flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
              <BookOpen size={25} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">
                My Subjects
              </h3>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Browse semester-wise curriculum
              </p>
            </div>

            <ChevronRight
              size={21}
              className="shrink-0 text-slate-400 group-hover:text-blue-600"
            />
          </Link>

          <div className="mx-5 border-t border-slate-100 dark:border-slate-700" />

          <Link
            href="/faculty/materials"
            className="group flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl bg-sky-50 p-3 text-sky-600 dark:bg-sky-950 dark:text-sky-300">
              <FolderOpen size={25} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">
                My Materials
              </h3>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                View and manage uploaded PDFs
              </p>
            </div>

            <ChevronRight
              size={21}
              className="shrink-0 text-slate-400 group-hover:text-blue-600"
            />
          </Link>
        </div>
      </section>

      {/* Recently added materials */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Recently Added
          </h2>

          <Link
            href="/faculty/materials"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            View All
            <ArrowUpRight size={16} />
          </Link>
        </div>

        {previewError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            <span>{previewError}</span>

            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setPreviewError("")}
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#17243B]">

          {loading ? (
            <div className="p-10 text-center">
              <Loader2
                size={27}
                className="mx-auto mb-3 animate-spin text-blue-600"
              />

              <p className="text-sm text-slate-500">
                Loading your dashboard...
              </p>
            </div>

          ) : error ? (

            <div className="p-8 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>

              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                Try Again
              </button>
            </div>

          ) : materials.length === 0 ? (

            <div className="p-10 text-center">
              <FolderOpen
                size={38}
                className="mx-auto mb-4 text-slate-400"
              />

              <h3 className="font-semibold">
                No materials uploaded yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Your latest PDFs will appear here.
              </p>

              <Link
                href="/faculty/upload"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus size={17} />
                Upload PDF
              </Link>
            </div>

          ) : (

            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {materials.map((material) => (
                <article
                  key={material.id}
                  className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5"
                >
                  <div className="shrink-0 rounded-xl bg-red-50 p-3 text-red-600 dark:bg-red-950">
                    <FileText size={23} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-semibold sm:text-base">
                      {material.title}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                      {materialTypes[material.material_type] ||
                        material.material_type}
                      {" - Semester "}
                      {material.semester}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(material.created_at)}
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label={`View ${material.title}`}
                    disabled={previewLoading !== null}
                    onClick={() => viewPdf(material)}
                    className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 p-2.5 text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:border-slate-600 dark:text-blue-400 dark:hover:bg-slate-800"
                  >
                    {previewLoading === material.id ? (
                      <Loader2
                        size={19}
                        className="animate-spin"
                      />
                    ) : (
                      <Eye size={19} />
                    )}

                    <span className="hidden text-sm font-medium sm:inline">
                      View
                    </span>
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Actual PDF preview */}
      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="PDF Preview"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-2 sm:p-6"
        >
          <div className="flex h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 sm:h-[90dvh]">

            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <div className="flex min-w-0 items-center gap-3">
                <FileText
                  size={22}
                  className="shrink-0 text-red-600"
                />

                <h2 className="truncate font-semibold">
                  {preview.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="Close PDF preview"
                className="rounded-lg border border-slate-200 p-2 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <X size={21} />
              </button>
            </header>

            <PDFViewer
              url={preview.url}
              title={preview.title}
            />
          </div>
        </div>
      )}
    </div>
  );
}
