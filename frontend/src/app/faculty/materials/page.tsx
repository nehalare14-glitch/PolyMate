"use client";

import { fetchSecurePDF, PDF_API_BASE } from "@/lib/secure-pdf";

import PDFViewer from "@/components/shared/PDFViewerDynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  subscribeSmartSync,
  notifySmartSync,
} from "@/lib/smart-sync";
import {
  Eye,
  FileText,
  FolderOpen,
  Plus,
  Search,
  RefreshCw,
  X,
  Loader2,
  MoreVertical,
  Pencil,
  FileUp,
  Trash2,
} from "lucide-react";

import { auth } from "@/lib/firebase";
import MaterialActionDialog, {
  type MaterialAction,
} from "@/components/faculty/MaterialActionDialog";
import { getBranchSubjects } from "@/data/curriculum";

type Material = {
  id: string;
  title: string;
  branch: string;
  semester: number;
  subject_name: string;
  subject_code?: string;
  material_type: string;
  created_at: string;
};

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:5000";

const filters = [
  { value: "all", label: "All" },
  { value: "notes", label: "Subject Notes" },
  { value: "question-paper", label: "Question Papers" },
  { value: "syllabus", label: "Syllabus" },
];

const typeLabels: Record<string, string> = {
  notes: "Subject Notes",
  "question-paper": "Question Paper",
  syllabus: "Syllabus",
  "lab-manual": "Lab Manual",
};

function getCode(material: Material) {
  if (material.subject_code) return material.subject_code;

  return getBranchSubjects(material.branch).find(
    (subject) =>
      subject.semester === Number(material.semester) &&
      subject.name.toLowerCase().trim() ===
        material.subject_name.toLowerCase().trim()
  )?.code ?? "";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function FacultyMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [management, setManagement] = useState<{
    action: MaterialAction;
    material: Material;
  } | null>(null);

  const [successMessage, setSuccessMessage] =
    useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
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

  const [openMenu, setOpenMenu] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeSmartSync(
      auth,
      async (user, initial) => {
        if (!active) return;

        if (initial) {
          setLoading(true);
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

          const response = await fetch(
            `${API}/api/faculty/materials`,
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
              data.error || "Unable to load materials."
            );
          }

          if (active && auth.currentUser?.uid === user.uid) {
            setMaterials(
              Array.isArray(data.materials)
                ? data.materials
                : []
            );
          }
        } catch (err) {
          if (active && auth.currentUser?.uid === user.uid) {
            setError(
              err instanceof Error
                ? err.message
                : "Unable to load materials."
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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return materials.filter((material) => {
      const matchesType =
        filter === "all" ||
        material.material_type === filter;

      const text = [
        material.title,
        material.subject_name,
        getCode(material),
        material.branch,
        `Semester ${material.semester}`,
      ].join(" ").toLowerCase();

      return matchesType && text.includes(query);
    });
  }, [materials, search, filter]);

  function openManagement(
    action: MaterialAction,
    material: Material
  ) {
    setOpenMenu(null);
    setSuccessMessage("");
    setPreviewError("");
    setManagement({ action, material });
  }
  async function viewPdf(material: Material) {
    setPreviewError("");
    setPreviewLoading(material.id);
    setOpenMenu(null);

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

  useEffect(() => {
    if (!preview) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreview(null);
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [preview]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">

      {/* Page header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            My Materials
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Manage your uploaded study materials.
          </p>
        </div>

        <Link
          href="/faculty/upload"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Upload PDF
        </Link>
      </header>

      {/* Search and material type filters */}
      <section className="space-y-4">
        <div className="relative">
          <Search
            size={19}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            aria-label="Search materials"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search by title, subject or code..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 sm:max-w-lg"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                filter === item.value
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {successMessage && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
        >
          <span>{successMessage}</span>

          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setSuccessMessage("")}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {/* Error notification */}
      {previewError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
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

      {/* Materials heading */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Uploaded Materials
          </h2>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {filtered.length} {filtered.length === 1 ? "PDF" : "PDFs"}
            </span>

            <button
              type="button"
              aria-label="Refresh materials"
              onClick={() => setRetry((value) => value + 1)}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-blue-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
            >
              <RefreshCw
                size={17}
                className={loading ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
            <Loader2
              size={28}
              className="mx-auto mb-3 animate-spin text-blue-600"
            />
            <p className="text-sm text-slate-500">
              Loading your materials...
            </p>
          </div>

        ) : error ? (

          /* Error */
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <h3 className="font-semibold">
              Unable to load materials
            </h3>

            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setRetry((value) => value + 1)}
              className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white"
            >
              Try Again
            </button>
          </div>

        ) : filtered.length === 0 ? (

          /* Empty state */
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
            <FolderOpen
              size={44}
              className="mx-auto mb-4 text-slate-400"
            />

            <h3 className="font-semibold">
              {materials.length === 0
                ? "No materials uploaded yet"
                : "No matching materials"}
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              {materials.length === 0
                ? "Upload your first PDF to get started."
                : "Try a different search or material type."}
            </p>

            {materials.length === 0 ? (
              <Link
                href="/faculty/upload"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white"
              >
                <Plus size={17} />
                Upload PDF
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="mt-5 text-sm font-medium text-blue-600"
              >
                Clear Filters
              </button>
            )}
          </div>

        ) : (

          /* Material cards */
          <div className="space-y-3">
            {filtered.map((material) => (
              <article
                key={material.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5"
              >
                <div className="flex items-start gap-3">

                  <div className="shrink-0 rounded-xl bg-red-50 p-3 text-red-600 dark:bg-red-950">
                    <FileText size={24} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-semibold">
                      {material.title}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {getCode(material)
                        ? `${getCode(material)} - `
                        : ""}
                      {material.subject_name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {material.branch} Â· Semester {material.semester}
                    </p>

                    <p className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                      {typeLabels[material.material_type] ??
                        material.material_type}
                    </p>
                  </div>

                  {/* Management menu */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      aria-label="Material actions"
                      aria-expanded={openMenu === material.id}
                      onClick={() =>
                        setOpenMenu(
                          openMenu === material.id
                            ? null
                            : material.id
                        )
                      }
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <MoreVertical size={20} />
                    </button>

                    {openMenu === material.id && (
                      <div className="absolute right-0 top-10 z-20 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">

                        <button
                          type="button"
                          onClick={() => viewPdf(material)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Eye size={16} />
                          View PDF
                        </button>

                        <button
                          type="button"
                          onClick={() => openManagement("edit", material)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Pencil size={16} />
                          Edit Details
                        </button>

                        <button
                          type="button"
                          onClick={() => openManagement("replace", material)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <FileUp size={16} />
                          Replace PDF
                        </button>

                        <button
                          type="button"
                          onClick={() => openManagement("delete", material)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 size={16} />
                          Move to Trash
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card footer */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">

                  <span className="text-xs text-slate-500">
                    Uploaded {formatDate(material.created_at)}
                  </span>

                  <button
                    type="button"
                    disabled={previewLoading !== null}
                    onClick={() => viewPdf(material)}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-800 dark:hover:bg-blue-950"
                  >
                    {previewLoading === material.id ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <Eye size={17} />
                    )}

                    {previewLoading === material.id
                      ? "Opening..."
                      : "View PDF"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {management && (
        <MaterialActionDialog
          key={`${management.action}-${management.material.id}`}
          action={management.action}
          material={management.material}
          onClose={() => setManagement(null)}
          onSuccess={(message) => {
            setManagement(null);
            setSuccessMessage(message);
            setRetry((value) => value + 1);
            notifySmartSync();
          }}
        />
      )}
      {/* PDF viewer */}
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
                aria-label="Close PDF viewer"
                onClick={() => setPreview(null)}
                className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <X size={18} />
                <span className="hidden sm:inline">
                  Close
                </span>
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

