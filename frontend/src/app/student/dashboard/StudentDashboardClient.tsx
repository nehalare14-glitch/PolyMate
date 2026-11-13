"use client";

import { fetchSecurePDF, PDF_API_BASE } from "@/lib/secure-pdf";

import PDFViewer from "@/components/shared/PDFViewerDynamic";

import Link from "next/link";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Layers3,
  GraduationCap,
  FolderOpen,
  Loader2,
  X,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import StudentSidebar from "@/components/student/StudentSidebar";
import { auth } from "@/lib/firebase";
import { subscribeSmartSync } from "@/lib/smart-sync";

import {
  getCurrentProfile,
  getRecentStudentMaterials,
} from "@/lib/auth-service";

type StudentProfile = {
  full_name: string | null;
  email: string;
  role: string;
};

type Material = {
  id: string;
  title: string;
  subject_name: string;
  branch: string;
  semester: number;
  material_type: string;
  created_at: string;
};

type Preview = {
  title: string;
  url: string;
};

const quickAccess = [
  {
    title: "Courses",
    description: "Explore diploma branches",
    href: "/student/courses",
    Icon: Layers3,
  },
  {
    title: "Subject Notes",
    description: "Access your study materials",
    href: "/student/notes",
    Icon: BookOpen,
  },
  {
    title: "Question Papers",
    description: "Prepare for your examinations",
    href: "/student/question-papers",
    Icon: FileText,
  },
];

const materialLabels: Record<string, string> = {
  notes: "Subject Notes",
  "question-paper": "Question Paper",
  syllabus: "Syllabus",
  "lab-manual": "Lab Manual",
};

function subscribeToDate(callback: () => void) {
  const timer = window.setInterval(callback, 60000);
  return () => window.clearInterval(timer);
}

function getTodaySnapshot() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function getServerDateSnapshot() {
  return "";
}

export default function StudentDashboardPage() {
  const [profile, setProfile] =
    useState<StudentProfile | null>(null);

  const [materials, setMaterials] =
    useState<Material[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  const [preview, setPreview] =
    useState<Preview | null>(null);

  const [previewLoading, setPreviewLoading] =
    useState<string | null>(null);

  const [previewError, setPreviewError] =
    useState("");

  const today = useSyncExternalStore(
    subscribeToDate,
    getTodaySnapshot,
    getServerDateSnapshot
  );

  useEffect(() => {
    let active = true;

    async function loadDashboard(initial: boolean) {
      if (initial) setLoading(true);
      setError("");

      try {
        const profileResponse =
          await getCurrentProfile();

        if (!active) return;

        setProfile(profileResponse.user);

        const materialResponse =
          await getRecentStudentMaterials();

        if (!active) return;

        setMaterials(
          materialResponse.materials ?? []
        );

      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load dashboard."
        );

      } finally {
        if (active) setLoading(false);
      }
    }

    const unsubscribe = subscribeSmartSync(
      auth,
      async (user, initial) => {
        if (!user) {
          if (active) {
            setProfile(null);
            setMaterials([]);
            setLoading(false);
          }
          return;
        }

        await loadDashboard(initial);
      },
      { intervalMs: 30000 }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [refresh]);

  async function openPreview(material: Material) {
    setPreviewLoading(material.id);
    setPreviewError("");

    try {
      const result = await fetchSecurePDF(
        `/api/student/materials/${encodeURIComponent(material.id)}/preview`,
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

  useEffect(() => {
    if (!preview) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreview(null);
      }
    }

    window.addEventListener(
      "keydown", handleKey
    );

    return () => {
      window.removeEventListener(
        "keydown", handleKey
      );
    };
  }, [preview]);

  const name =
    profile?.full_name?.trim() || "";

  const initial =
    name.charAt(0).toUpperCase() ||
    profile?.email?.charAt(0).toUpperCase() ||
    "S";

  return (
    <div className="min-h-dvh bg-[#F6F8FC] text-slate-900 dark:bg-[#0B1220] dark:text-[#F1F5F9]">

      <StudentSidebar />

      <main className="min-h-dvh min-w-0 px-3 pb-8 pt-20 sm:px-6 sm:pb-12 sm:pt-24 md:ml-64 md:px-8 md:pt-10 xl:px-10">

        <div className="mx-auto min-w-0 max-w-7xl space-y-5 sm:space-y-7">

          {/* Page Header */}

          <header className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Student Portal
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Dashboard
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Your academic learning workspace.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <Link
              href="/student/profile"
              aria-label="Open My Profile"
              title="My Profile"
              className="flex h-10 w-10 shrink-0 items-center justify-center sm:h-12 sm:w-12 rounded-full border border-blue-200 bg-blue-100 text-lg font-bold text-blue-700 transition-colors hover:bg-blue-200 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
            >
              {initial}
            </Link>
            </div>

          </header>

          {/* Welcome Banner */}

          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#102A78] via-[#1746B8] to-[#2563EB] p-4 text-white shadow-sm sm:p-9">

            <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/15" />

            <div className="pointer-events-none absolute -bottom-28 right-24 h-64 w-64 rounded-full bg-white/5" />

            <div className="relative z-10 flex items-center justify-between gap-6">

              <div className="min-w-0 flex-1">

                <p className="text-xs font-medium uppercase tracking-wider text-blue-200">
                  {today}
                </p>

                <h2 className="mt-3 break-words text-xl font-bold leading-tight sm:mt-4 sm:text-4xl">
                  {name
                    ? `Welcome, ${name}!`
                    : "Welcome to PolyMate!"}
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:mt-4 sm:text-base sm:leading-7">
                  Your learning journey starts here.
                  Explore courses, study materials and
                  question papers.
                </p>

                <Link
                  href="/student/courses"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl !bg-white px-5 py-3 text-sm font-semibold !text-blue-700 transition-colors hover:!bg-blue-50"
                >
                  Explore Courses
                  <ArrowRight size={17} />
                </Link>

              </div>

              <div className="hidden shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/10 p-7 sm:flex">

                <GraduationCap
                  size={88}
                  strokeWidth={1.3}
                  className="text-blue-100"
                  aria-hidden="true"
                />

              </div>

            </div>

          </section>

          {/* Quick Access */}

          <section>

            <h2 className="text-lg font-bold">
              Quick Access
            </h2>

            <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">

              {quickAccess.map(
                ({ title, description, href, Icon }) => (

                  <Link
                    key={title}
                    href={href}
                    className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors sm:p-5 hover:border-blue-400 dark:border-[#30415D] dark:bg-[#0F1D38] dark:hover:border-blue-500"
                  >

                    <span className="shrink-0 rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-[#172B4C] dark:text-blue-400">
                      <Icon size={25} />
                    </span>

                    <div className="min-w-0 flex-1">

                      <h3 className="font-semibold">
                        {title}
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {description}
                      </p>

                    </div>

                    <ArrowRight
                      size={18}
                      className="shrink-0 text-slate-400 group-hover:text-blue-600"
                    />

                  </Link>
                )
              )}

            </div>

          </section>

          {/* Recently Added Materials */}

          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#30415D] dark:bg-[#0F1D38] sm:p-6">

            <div className="flex flex-wrap items-center justify-between gap-3">

              <div>
                <h2 className="text-lg font-bold">
                  Recently Added Materials
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Latest study resources uploaded by faculty.
                </p>
              </div>

              <Link
                href="/student/courses"
                className="flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                View All
                <ArrowRight size={16} />
              </Link>

            </div>

            {loading ? (

              <div className="flex items-center justify-center gap-3 py-14 text-sm text-slate-500">

                <Loader2
                  size={22}
                  className="animate-spin text-blue-600"
                />

                Loading materials...

              </div>

            ) : error ? (

              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">

                <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">

                  <AlertCircle size={19} />

                  {error}

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setRefresh((value) => value + 1)
                  }
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-700 dark:bg-slate-800 dark:text-blue-300"
                >
                  <RefreshCw size={15} />
                  Try Again
                </button>

              </div>

            ) : materials.length === 0 ? (

              <div className="flex flex-col items-center py-14 text-center">

                <div className="rounded-2xl bg-slate-100 p-4 dark:bg-[#17243B]">

                  <FolderOpen
                    size={34}
                    className="text-slate-400"
                  />

                </div>

                <h3 className="mt-4 font-semibold">
                  No materials available yet
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                  New study materials will appear here
                  when faculty upload PDFs.
                </p>

              </div>

            ) : (

              <div className="mt-5 divide-y divide-slate-100 dark:divide-[#30415D]">

                {materials.map((material) => (

                  <div
                    key={material.id}
                    className="flex flex-wrap items-center gap-3 py-4 sm:flex-nowrap sm:gap-4"
                  >

                    <div className="shrink-0 rounded-xl bg-red-50 p-3 text-red-500 dark:bg-red-950/40 dark:text-red-400">

                      <FileText size={23} />

                    </div>

                    <div className="min-w-0 flex-1">

                      <h3 className="break-words text-sm font-semibold">
                        {material.title}
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {material.branch}
                        {" - Semester "}
                        {material.semester}
                        {" - "}
                        {materialLabels[
                          material.material_type
                        ] || material.material_type}
                      </p>

                    </div>

                    <button
                      type="button"
                      disabled={previewLoading !== null}
                      onClick={() =>
                        void openPreview(material)
                      }
                      className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 sm:w-auto text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-950 dark:text-blue-300"
                    >

                      {previewLoading === material.id
                        ? <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        : "View PDF"}

                    </button>

                  </div>

                ))}

              </div>

            )}

            {previewError && (

              <p
                role="alert"
                className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300"
              >
                {previewError}
              </p>

            )}

          </section>

          <footer className="text-center text-xs text-slate-400">
            PolyMate Student Portal
          </footer>

        </div>

      </main>

      {/* PDF Preview Dialog */}

      {preview && (

        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="PDF preview"
          onClick={() => setPreview(null)}
        >

          <div
            className="flex h-dvh min-w-0 w-full max-w-6xl flex-col overflow-hidden rounded-none sm:h-[92dvh] sm:rounded-2xl bg-white shadow-2xl dark:bg-[#0F1D38]"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-[#30415D]">

              <div className="min-w-0">

                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  PDF Preview
                </p>

                <h2 className="mt-1 truncate text-sm font-semibold sm:text-base">
                  {preview.title}
                </h2>

              </div>

              <button
                type="button"
                autoFocus
                aria-label="Close PDF preview"
                onClick={() => setPreview(null)}
                className="shrink-0 rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-[#223553]"
              >
                <X size={23} />
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
