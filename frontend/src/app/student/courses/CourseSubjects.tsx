"use client";

import { fetchSecurePDF, PDF_API_BASE } from "@/lib/secure-pdf";

import PDFViewer from "@/components/shared/PDFViewerDynamic";

import { useEffect, useState } from "react";
import {
  BookOpen,
  FileText,
  FolderOpen,
  ChevronRight,
  ArrowLeft,
  Loader2,
  X,
} from "lucide-react";

import {
  getBranchSubjects,
  type CurriculumSubject,
} from "@/data/curriculum";

import { auth } from "@/lib/firebase";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:5000";

type Material = {
  id: string;
  title: string;
  subject_name: string;
  branch: string;
  semester: number;
  material_type: string;
};

const materialTypes = [
  { value: "notes", label: "Subject Notes" },
  { value: "question-paper", label: "Question Papers" },
  { value: "syllabus", label: "Syllabus" },
];

async function request(path: string) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in again.");
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

export default function CourseSubjects({
  branch,
  scheme,
  semester,
}: {
  branch: string;
  scheme: string;
  semester: number;
}) {
  const [subject, setSubject] =
    useState<CurriculumSubject | null>(null);

  const [type, setType] = useState("notes");

  const [materials, setMaterials] =
    useState<Material[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const [preview, setPreview] =
    useState<{ title: string; url: string } | null>(null);

  const [opening, setOpening] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const subjects = getBranchSubjects(branch).filter(
    (item) =>
      item.semester === semester &&
      item.scheme === scheme
  );

  useEffect(() => {
    if (!subject) return;

    let active = true;

    async function loadMaterials() {
      setLoading(true);
      setError("");
      setMaterials([]);

      try {
        const found: Material[] = [];

        let page = 1;
        const limit = 100;

        while (active) {
          const params = new URLSearchParams({
            branch,
            semester: String(semester),
            material_type: type,
            page: String(page),
            limit: String(limit),
          });

          const data = await request(
            `/api/student/materials?${params}`
          );

          const rows: Material[] =
            data.materials ?? [];

          found.push(
            ...rows.filter(
              (item) =>
                item.subject_name.trim().toLowerCase() ===
                subject!.name.trim().toLowerCase()
            )
          );

          if (
            rows.length < limit ||
            page * limit >= data.total
          ) {
            break;
          }

          page += 1;
        }

        if (active) {
          setMaterials(found);
        }

      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load materials."
          );
        }

      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadMaterials();

    return () => {
      active = false;
    };
  }, [branch, semester, subject, type, retry]);

  async function openPDF(material: Material) {
    setOpening(true);
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
      setOpening(false);
    }
  }

  useEffect(() => {
    if (!preview) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreview(null);
      }
    }

    window.addEventListener(
      "keydown", closeOnEscape
    );

    return () => {
      window.removeEventListener(
        "keydown", closeOnEscape
      );
    };
  }, [preview]);

  function selectSubject(item: CurriculumSubject) {
    setSubject(item);
    setType("notes");
    setMaterials([]);
    setError("");
    setPreviewError("");
    setLoading(true);
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#30415D] dark:bg-[#0F1D38] sm:p-6">

      {!subject ? (

        <>

          <div className="flex items-center justify-between gap-3">

            <div>
              <h2 className="text-lg font-bold">
                Semester {semester} - Subjects
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {branch} - {scheme} Curriculum
              </p>
            </div>

            <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {subjects.length} Subjects
            </span>

          </div>

          {subjects.length === 0 ? (

            <div className="flex flex-col items-center py-12 text-center">

              <FolderOpen
                size={38}
                className="text-slate-400"
              />

              <h3 className="mt-4 font-semibold">
                Curriculum data unavailable
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                Subject details for this branch and
                semester have not been added yet.
              </p>

            </div>

          ) : (

            <div className="mt-5 grid gap-3 lg:grid-cols-2">

              {subjects.map((item) => (

                <button
                  key={item.code}
                  type="button"
                  onClick={() => selectSubject(item)}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left hover:border-blue-400 hover:bg-blue-50 dark:border-[#30415D] dark:hover:bg-[#172B4C]"
                >

                  <span className="shrink-0 rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-[#172B4C] dark:text-blue-400">
                    <BookOpen size={23} />
                  </span>

                  <div className="min-w-0 flex-1">

                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      {item.code}
                    </p>

                    <h3 className="mt-1 text-sm font-semibold leading-6">
                      {item.name}
                    </h3>

                    {item.elective && (
                      <span className="mt-1 inline-block text-xs text-slate-500 dark:text-slate-400">
                        Elective Subject
                      </span>
                    )}

                  </div>

                  <ChevronRight
                    size={18}
                    className="shrink-0 text-blue-600 dark:text-blue-400"
                  />

                </button>

              ))}

            </div>

          )}

        </>

      ) : (

        <>

          <button
            type="button"
            disabled={opening}
            onClick={() => setSubject(null)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400"
          >
            <ArrowLeft size={17} />
            Back to Subjects
          </button>

          <div className="mt-5">

            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              {subject.code} - {scheme}
            </p>

            <h2 className="mt-2 text-xl font-bold">
              {subject.name}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {branch} - Semester {semester}
            </p>

          </div>

          {/* Material Type Selection */}

          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">

            {materialTypes.map((item) => (

              <button
                key={item.value}
                type="button"
                disabled={opening}
                aria-pressed={type === item.value}
                onClick={() => {
                  setType(item.value);
                  setPreviewError("");
                }}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold ${
                  type === item.value
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "border-slate-200 hover:border-blue-400 dark:border-[#30415D]"
                }`}
              >
                {item.label}
              </button>

            ))}

          </div>

          {loading ? (

            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">

              <Loader2
                size={21}
                className="animate-spin text-blue-600"
              />

              Loading materials...

            </div>

          ) : error ? (

            <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">

              <p>{error}</p>

              <button
                type="button"
                onClick={() => setRetry((n) => n + 1)}
                className="mt-3 font-semibold underline"
              >
                Try Again
              </button>

            </div>

          ) : materials.length === 0 ? (

            <div className="flex flex-col items-center py-12 text-center">

              <FolderOpen
                size={36}
                className="text-slate-400"
              />

              <h3 className="mt-4 font-semibold">
                No materials available yet
              </h3>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Faculty-uploaded PDFs will appear here.
              </p>

            </div>

          ) : (

            <div className="mt-5 divide-y divide-slate-100 dark:divide-[#30415D]">

              {materials.map((material) => (

                <div
                  key={material.id}
                  className="flex items-center gap-3 py-4"
                >

                  <span className="shrink-0 rounded-xl bg-red-50 p-3 text-red-500 dark:bg-red-950/30">
                    <FileText size={23} />
                  </span>

                  <div className="min-w-0 flex-1">

                    <h3 className="break-words text-sm font-semibold">
                      {material.title}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      PDF Document
                    </p>

                  </div>

                  <button
                    type="button"
                    disabled={opening}
                    onClick={() => void openPDF(material)}
                    className="shrink-0 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50 dark:bg-blue-950 dark:text-blue-300"
                  >
                    {opening ? "Opening..." : "View PDF"}
                  </button>

                </div>

              ))}

            </div>

          )}

          {previewError && (
            <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-300">
              {previewError}
            </p>
          )}

        </>

      )}

      {preview && (

        <div
          role="dialog"
          aria-modal="true"
          aria-label="PDF Preview"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-2 sm:p-6"
        >

          <div className="flex h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-[#0F1D38]">

            <header className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-[#30415D]">

              <h2 className="truncate font-semibold">
                {preview.title}
              </h2>

              <button
                type="button"
                autoFocus
                aria-label="Close PDF"
                onClick={() => setPreview(null)}
                className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-[#223553]"
              >
                <X size={22} />
              </button>

            </header>

            <PDFViewer
              url={preview.url}
              title={preview.title}
            />

          </div>

        </div>

      )}

    </section>
  );
}
