"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  FileText,
  Eye,
  X,
  Loader2,
  FolderOpen,
  Plus,
  RefreshCw,
} from "lucide-react";

import { auth } from "@/lib/firebase";
import {
  getBranchSubjects,
  type CurriculumSubject,
} from "@/data/curriculum";

type Material = {
  id: string;
  title: string;
  subject_name: string;
  subject_code?: string;
  branch: string;
  semester: number;
  material_type: string;
  created_at: string;
};

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:5000";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matchesSubject(
  material: Material,
  subject: CurriculumSubject
) {
  if (
    normalize(material.branch) !== normalize(subject.branch) ||
    Number(material.semester) !== subject.semester
  ) {
    return false;
  }

  if (material.subject_code) {
    return material.subject_code === subject.code;
  }

  const name = normalize(material.subject_name);

  if (name === normalize(subject.name)) {
    return true;
  }

  const aliases: Record<string, string[]> = {
    "CS-402": ["java", "java programming"],
    "CS-403": ["python", "python programming"],
    "CS-404": ["dbms", "rdbms", "database management systems"],
    "CS-303": ["data structures", "data structures through c"],
  };

  return (aliases[subject.code] ?? []).includes(name);
}

export default function FacultySubjectsPage() {
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState(1);
  const [selected, setSelected] =
    useState<CurriculumSubject | null>(null);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const [preview, setPreview] = useState<{
    title: string;
    url: string;
  } | null>(null);

  const [previewLoading, setPreviewLoading] =
    useState<string | null>(null);

  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!active) return;

        setLoading(true);
        setError("");
        setBranch("");
        setMaterials([]);

        if (!user) {
          setError("Please sign in again.");
          setLoading(false);
          return;
        }

        try {
          const token = await user.getIdToken();

          const headers = {
            Authorization: `Bearer ${token}`,
          };

          const [profileResponse, materialsResponse] =
            await Promise.all([
              fetch(`${API}/api/me`, {
                headers,
                cache: "no-store",
              }),
              fetch(`${API}/api/faculty/materials`, {
                headers,
                cache: "no-store",
              }),
            ]);

          const profileData = await profileResponse.json();
          const materialsData = await materialsResponse.json();

          if (!profileResponse.ok) {
            throw new Error(
              profileData.error || "Unable to load profile."
            );
          }

          if (!materialsResponse.ok) {
            throw new Error(
              materialsData.error || "Unable to load materials."
            );
          }

          const profile =
            profileData.user ??
            profileData.profile ??
            profileData;

          if (profile.role !== "faculty") {
            throw new Error("Faculty access required.");
          }

          const registeredBranch =
            profile.faculty_branch?.trim().toUpperCase();

          if (!registeredBranch) {
            throw new Error(
              "Your registered branch is missing."
            );
          }

          if (!active) return;

          setBranch(registeredBranch);
          setMaterials(materialsData.materials ?? []);
        } catch (err) {
          if (active) {
            setError(
              err instanceof Error
                ? err.message
                : "Unable to load subjects."
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
  }, [retry]);

  async function viewPdf(material: Material) {
    setPreviewError("");
    setPreviewLoading(material.id);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Please sign in again.");
      }

      const token = await user.getIdToken();

      const response = await fetch(
        `${API}/api/faculty/materials/${material.id}/preview`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to open PDF.");
      }

      if (!data.url) {
        throw new Error("PDF preview URL is missing.");
      }

      setPreview({
        title: material.title,
        url: data.url,
      });
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

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreview(null);
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [preview]);

  const subjects = getBranchSubjects(branch);

  const semesterSubjects = subjects.filter(
    (subject) => subject.semester === semester
  );

  const subjectMaterials = selected
    ? materials.filter((material) =>
        matchesSubject(material, selected)
      )
    : [];

  const uploadUrl = selected
    ? `/faculty/upload?semester=${selected.semester}&subject=${encodeURIComponent(selected.name)}&subjectCode=${selected.code}`
    : "/faculty/upload";

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
        <RefreshCw className="mx-auto mb-3 animate-spin text-blue-600" />
        <p>Loading your subjects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">
          Unable to load subjects
        </h2>
        <p className="mt-2 text-sm text-red-600">{error}</p>

        <button
          onClick={() => setRetry((value) => value + 1)}
          className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">

      {previewError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          <span>{previewError}</span>

          <button
            type="button"
            onClick={() => setPreviewError("")}
            aria-label="Dismiss error"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="PDF Viewer"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-2 sm:p-6"
        >
          <div className="flex h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 sm:h-[90dvh]">

            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-slate-700">

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileText
                    size={20}
                    className="shrink-0 text-red-600"
                  />

                  <h2 className="truncate text-sm font-semibold sm:text-base">
                    {preview.title}
                  </h2>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  PDF Preview
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="Close PDF viewer"
                className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <X size={18} />
                <span className="hidden sm:inline">Close</span>
              </button>
            </header>

            <iframe
              src={preview.url + "#toolbar=0&navpanes=0"}
              title={preview.title}
              className="min-h-0 w-full flex-1 border-0 bg-slate-100 dark:bg-slate-800"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            My Subjects
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {branch === "CSE"
              ? "Computer Science & Engineering"
              : branch}
            {" · C24 Curriculum"}
          </p>
        </div>

        <Link
          href={uploadUrl}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
        >
          <Plus size={18} />
          Upload PDF
        </Link>
      </header>

      {subjects.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <BookOpen className="mx-auto mb-4 text-blue-600" size={36} />
          <h2 className="font-semibold">
            Curriculum coming soon
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            The subject catalog for {branch} has not been added yet.
          </p>
        </section>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-lg font-semibold">
              Semester
            </h2>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {[1, 2, 3, 4, 5, 6].map((number) => (
                <button
                  key={number}
                  onClick={() => {
                    setSemester(number);
                    setSelected(null);
                  }}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                    semester === number
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                  }`}
                >
                  Semester {number}
                </button>
              ))}
            </div>
          </section>

          {!selected ? (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">
                Semester {semester} Subjects
              </h2>

              {semester === 6 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
                  <BriefcaseBusiness
                    size={32}
                    className="mb-4 text-blue-600"
                  />
                  <h3 className="text-lg font-semibold">
                    Industrial Training
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    601 · 20 Credits
                  </p>
                  <p className="mt-3 text-sm">
                    No regular theory subjects in Semester 6.
                  </p>
                </div>
              ) : (
                <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {semesterSubjects.map((subject) => {
                    const count = materials.filter((material) =>
                      matchesSubject(material, subject)
                    ).length;

                    return (
                      <button
                        key={subject.code}
                        onClick={() => setSelected(subject)}
                        className="flex h-full min-h-[180px] flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
                      >
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950">
                          <BookOpen size={22} />
                        </div>

                        <p className="text-xs font-medium text-blue-600">
                          {subject.code}
                        </p>

                        <h3 className="mt-2 break-words text-sm font-semibold leading-6 sm:text-base">
                          {subject.name}
                        </h3>

                        {subject.elective && (
                          <p className="mt-2 text-xs text-slate-500">
                            Elective
                          </p>
                        )}

                        <div className="mt-auto flex w-full items-center justify-between pt-4 text-sm text-slate-500">
                          <span>
                            {count} {count === 1 ? "PDF" : "PDFs"}
                          </span>
                          <ArrowRight size={17} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            <section className="space-y-4">
              <button
                onClick={() => setSelected(null)}
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600"
              >
                <ArrowLeft size={17} />
                Back to Subjects
              </button>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {selected.name}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      {selected.code} · {branch} · Semester {semester}
                    </p>
                  </div>

                  <span className="text-sm text-slate-500">
                    {subjectMaterials.length} PDFs
                  </span>
                </div>

                {subjectMaterials.length === 0 ? (
                  <div className="py-14 text-center">
                    <FolderOpen
                      size={42}
                      className="mx-auto mb-4 text-slate-400"
                    />

                    <h3 className="font-semibold">
                      No materials uploaded yet
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                      Upload your first PDF for this subject.
                    </p>

                    <Link
                      href={uploadUrl}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white"
                    >
                      <Plus size={17} />
                      Upload PDF
                    </Link>
                  </div>
                ) : (
                  <div className="mt-6 divide-y divide-slate-200 dark:divide-slate-700">
                    {subjectMaterials.map((material) => (
                      <div
                        key={material.id}
                        className="flex flex-wrap items-center gap-4 py-4"
                      >
                        <div className="rounded-xl bg-red-50 p-3 text-red-600 dark:bg-red-950">
                          <FileText size={23} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="break-words font-medium">
                            {material.title}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {material.material_type
                              .replaceAll("-", " ")}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => viewPdf(material)}
                            disabled={previewLoading !== null}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-800 dark:hover:bg-blue-950"
                          >
                            {previewLoading === material.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Eye size={16} />
                            )}

                            {previewLoading === material.id
                              ? "Opening..."
                              : "View PDF"}
                          </button>

                          <Link
                            href="/faculty/materials"
                            className="text-sm font-medium text-slate-500 hover:text-blue-600"
                          >
                            Manage
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}


