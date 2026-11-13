"use client";

import { fetchSecurePDF, PDF_API_BASE } from "@/lib/secure-pdf";

import PDFViewer from "@/components/shared/PDFViewerDynamic";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Bookmark,
  FileText,
  Search,
  Eye,
  FolderOpen,
  Loader2,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import StudentSidebar from "@/components/student/StudentSidebar";
import { auth } from "@/lib/firebase";
import {
  subscribeSmartSync,
  notifySmartSync,
} from "@/lib/smart-sync";

import {
  getStudentBookmarks,
  getStudentBookmarkIds,
  saveStudentBookmark,
  removeStudentBookmark,
} from "@/lib/auth-service";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:5000";

const branches = [
  "CSE",
  "ECE",
  "EEE",
  "MEC",
  "CIVIL",
  "AIML",
  "CCP",
];

type Material = {
  id: string;
  title: string;
  subject_name: string;
  branch: string;
  semester: number;
  material_type: string;
  created_at: string;
};

type MaterialType = "notes" | "question-paper";

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

export default function StudentMaterials({
  materialType,
  bookmarksOnly = false,
}: {
  materialType: MaterialType;
  bookmarksOnly?: boolean;
}) {
  const isNotes = materialType === "notes";

  const title = bookmarksOnly
    ? "Bookmarks"
    : isNotes
      ? "Subject Notes"
      : "Question Papers";

  const [materials, setMaterials] =
    useState<Material[]>([]);

  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");

  const [savedType, setSavedType] =
    useState<"" | MaterialType>("");

  const [bookmarkIds, setBookmarkIds] =
    useState<Set<string>>(new Set());

  const [bookmarksReady, setBookmarksReady] =
    useState(false);

  const [bookmarkBusy, setBookmarkBusy] =
    useState<string | null>(null);

  const bookmarkMutation = useRef(0);

  const [bookmarkError, setBookmarkError] =
    useState("");

  const [bookmarkRetry, setBookmarkRetry] =
    useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [totalMaterials, setTotalMaterials] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [serverSubjects, setServerSubjects] = useState<string[]>([]);
  const [subjectError, setSubjectError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (bookmarksOnly) return;

    let active = true;

    async function loadSubjects() {
      setSubjectError("");

      try {
        const params = new URLSearchParams({
          material_type: materialType,
        });

        if (branch) params.set("branch", branch);
        if (semester) params.set("semester", semester);

        const data = await request(
          `/api/student/materials/subjects?${params}`
        );

        if (active) {
          setServerSubjects(data.subjects ?? []);
        }
      } catch (err) {
        if (active) {
          setServerSubjects([]);
          setSubjectError(
            err instanceof Error
              ? err.message
              : "Unable to load subject filters."
          );
        }
      }
    }

    const unsubscribe = subscribeSmartSync(
      auth,
      async (user) => {
        if (user) await loadSubjects();
      },
      { intervalMs: 30000 }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [materialType, branch, semester, bookmarksOnly, retry]);

  const [preview, setPreview] =
    useState<{ title: string; url: string } | null>(
      null
    );

  const [opening, setOpening] =
    useState<string | null>(null);

  const [previewError, setPreviewError] =
    useState("");

  useEffect(() => {
    let active = true;

    async function loadMaterials(initial: boolean) {
      if (initial) {
        setLoading(true);
        setMaterials([]);
      }

      setError("");

      try {
        const found: Material[] = [];
      const bookmarkVersion = bookmarkMutation.current;

        if (bookmarksOnly) {
          let savedPage = 1;
          const savedLimit = 100;

          while (active) {
            const result = await getStudentBookmarks(
              savedType || undefined,
              savedPage,
              savedLimit
            );

            found.push(...result.bookmarks);

            if (
              result.bookmarks.length < savedLimit ||
              found.length >= result.total
            ) {
              break;
            }

            savedPage++;
          }

          if (
            active &&
            bookmarkVersion % 2 === 0 &&
            bookmarkVersion === bookmarkMutation.current
          ) {
            setMaterials(found);
          }

          return;
        }

        const params = new URLSearchParams({
          material_type: materialType,
          page: String(page),
          limit: String(pageSize),
        });

        if (branch) params.set("branch", branch);
        if (semester) params.set("semester", semester);
        if (subject) params.set("subject", subject);

        if (debouncedSearch) {
          params.set("search", debouncedSearch);
        }

        const data = await request(
          `/api/student/materials?${params}`
        );

        if (active) {
          const total = Number(data.total ?? 0);
          const lastPage = Math.max(
            1,
            Math.ceil(total / pageSize)
          );

          setTotalMaterials(total);

          if (page > lastPage) {
            setPage(lastPage);
          } else {
            setMaterials(data.materials ?? []);
          }
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

    const unsubscribe = subscribeSmartSync(
      auth,
      async (user, initial) => {
        if (!user) {
          if (active) {
            setMaterials([]);
            setLoading(false);
          }
          return;
        }

        await loadMaterials(initial);
      },
      { intervalMs: 30000 }
    );

    return () => {
      active = false;
      unsubscribe();
    };

  }, [
    materialType,
    branch,
    semester,
    subject,
    debouncedSearch,
    page,
    pageSize,
    retry,
    bookmarksOnly,
    savedType,
  ]);

  useEffect(() => {
    let active = true;


    async function loadBookmarks() {
      const version = bookmarkMutation.current;

      if (version % 2 !== 0) return;

      try {
        const ids = await getStudentBookmarkIds();

        if (
          active &&
          version === bookmarkMutation.current
        ) {
          setBookmarkIds(new Set(ids));
          setBookmarksReady(true);
        }
      } catch (err) {
        if (active) {
          setBookmarkError(
            err instanceof Error
              ? err.message
              : "Unable to load bookmarks."
          );
        }
      }
    }

    const unsubscribe = subscribeSmartSync(
      auth,
      async (user) => {
        if (!user) {
          if (active) {
            setBookmarkIds(new Set());
            setBookmarksReady(false);
          }
          return;
        }

        await loadBookmarks();
      },
      { intervalMs: 30000 }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [bookmarkRetry]);

  function retryBookmarks() {
    setBookmarksReady(false);
    setBookmarkError("");
    setBookmarkRetry((previous) => previous + 1);
  }

  async function toggleBookmark(material: Material) {
    if (!bookmarksReady || bookmarkBusy) return;

    bookmarkMutation.current++;
    setBookmarkBusy(material.id);
    setBookmarkError("");

    const alreadySaved = bookmarkIds.has(material.id);

    try {
      if (alreadySaved) {
        await removeStudentBookmark(material.id);
      } else {
        await saveStudentBookmark(material.id);
      }

      setBookmarkIds((previous) => {
        const next = new Set(previous);

        if (alreadySaved) {
          next.delete(material.id);
        } else {
          next.add(material.id);
        }

        return next;
      });

      if (bookmarksOnly && alreadySaved) {
        setMaterials((previous) =>
          previous.filter((item) => item.id !== material.id)
        );
      }

    } catch (err) {
      setBookmarkError(
        err instanceof Error
          ? err.message
          : "Unable to update bookmark."
      );
    } finally {
      bookmarkMutation.current++;
      setBookmarkBusy(null);
      notifySmartSync();
    }
  }

  const subjectOptions = useMemo(() => {
    if (!bookmarksOnly) {
      return serverSubjects;
    }

    return Array.from(
      new Set(
        materials
          .filter((item) =>
            (!branch || item.branch === branch) &&
            (!semester || String(item.semester) === semester)
          )
          .map((item) => item.subject_name)
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [materials, branch, semester, bookmarksOnly, serverSubjects]);

  const filtered = useMemo(() => {
    if (!bookmarksOnly) return materials;

    const query = search.trim().toLowerCase();

    return materials.filter((item) => {
      const text =
        `${item.title} ${item.subject_name}`
          .toLowerCase();

      return (
        text.includes(query) &&
        (!subject || item.subject_name === subject) &&
        (!branch || item.branch === branch) &&
        (!semester || String(item.semester) === semester)
      );
    });
  }, [materials, search, subject, branch, semester, bookmarksOnly]);

  const totalCount = bookmarksOnly
    ? filtered.length
    : totalMaterials;

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / pageSize)
  );

  const currentPage = Math.min(page, totalPages);

  const visible = bookmarksOnly
    ? filtered.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
      )
    : materials;

  function resetFilters() {
    setBranch("");
    setSemester("");
    setSearch("");
    setSubject("");
    setPage(1);
  }

  async function openPDF(material: Material) {
    setOpening(material.id);
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
      setOpening(null);
    }
  }

  useEffect(() => {
    if (!preview) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreview(null);
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [preview]);

  const selectClass =
    "mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-[#30415D] dark:bg-[#17243B] dark:text-white";

  return (
    <div className="min-h-dvh bg-[#F6F8FC] text-slate-900 dark:bg-[#0B1220] dark:text-[#F1F5F9]">

      <StudentSidebar />

      <main className="min-h-dvh min-w-0 px-3 pb-8 pt-20 sm:px-6 sm:pb-12 sm:pt-24 md:ml-64 md:px-8 md:pt-10 xl:px-10">

        <div className="mx-auto min-w-0 max-w-7xl space-y-5 sm:space-y-6">

          {/* Page Header */}

          <header>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Student Portal
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {bookmarksOnly
                ? "Access your saved notes and question papers."
                : isNotes
                  ? "Browse notes uploaded by faculty."
                  : "Explore question papers uploaded by faculty."}
            </p>
          </header>

          {bookmarksOnly && (
            <div className="flex flex-wrap gap-2">
              {([
                ["", "All"],
                ["notes", "Notes"],
                ["question-paper", "Question Papers"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={savedType === value}
                  onClick={() => {
                    setSavedType(value);
                    setSubject("");
                    setPage(1);
                  }}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                    savedType === value
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 dark:border-[#30415D] dark:bg-[#0F1D38] dark:text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Search and Filters */}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#30415D] dark:bg-[#0F1D38] sm:p-5">

            <div className="grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-5 lg:items-end">

              <div className="lg:col-span-2">

                <label
                  htmlFor="material-search"
                  className="text-sm font-semibold"
                >
                  Search
                </label>

                <div className="relative mt-2">

                  <Search
                    size={19}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />

                  <input
                    id="material-search"
                    type="search"
                    maxLength={120}
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder={
                      bookmarksOnly
                        ? "Search saved materials..."
                        : isNotes
                          ? "Search notes or subjects..."
                          : "Search papers or subjects..."
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-base outline-none focus:border-blue-500 dark:border-[#30415D] dark:bg-[#17243B] sm:text-sm"
                  />

                </div>

              </div>

              <div className="grid min-w-0 grid-cols-2 gap-3 lg:col-span-3 lg:grid-cols-3">

                <div className="min-w-0">

                  <label
                    htmlFor="branch-filter"
                    className="text-sm font-semibold"
                  >
                    Branch
                  </label>

                  <select
                    id="branch-filter"
                    value={branch}
                    onChange={(event) => {
                      setBranch(event.target.value);
                      setSubject("");
                      setPage(1);
                    }}
                    className={selectClass}
                  >
                    <option value="">
                      All Branches
                    </option>

                    {branches.map((item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    ))}

                  </select>

                </div>

                <div className="min-w-0">

                  <label
                    htmlFor="semester-filter"
                    className="text-sm font-semibold"
                  >
                    Semester
                  </label>

                  <select
                    id="semester-filter"
                    value={semester}
                    onChange={(event) => {
                      setSemester(event.target.value);
                      setSubject("");
                      setPage(1);
                    }}
                    className={selectClass}
                  >

                    <option value="">
                      All Semesters
                    </option>

                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        Semester {n}
                      </option>
                    ))}

                  </select>

                </div>

                <div className="col-span-2 min-w-0 lg:col-span-1">
                  <label
                    htmlFor="subject-filter"
                    className="text-sm font-semibold"
                  >
                    Subject
                  </label>

                  <select
                    id="subject-filter"
                    value={subject}
                    onChange={(event) => {
                      setSubject(event.target.value);
                      setPage(1);
                    }}
                    className={selectClass}
                  >
                    <option value="">All Subjects</option>

                    {subjectOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

            </div>

            {subjectError && !bookmarksOnly && (
              <div
                role="alert"
                className="mt-3 text-sm text-red-600 dark:text-red-400"
              >
                <p>{subjectError}</p>

                <button
                  type="button"
                  onClick={() => setRetry((n) => n + 1)}
                  className="mt-1 font-semibold underline"
                >
                  Retry subject filters
                </button>
              </div>
            )}

            {(branch || semester || search || subject) && (

              <div className="mt-4 flex justify-end">

                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400"
                >
                  <RotateCcw size={15} />
                  Reset Filters
                </button>

              </div>

            )}

          </section>

          {/* Materials */}

          <section>

            <div className="flex items-center justify-between gap-3">

              <h2 className="text-lg font-bold">
                {bookmarksOnly
                  ? "Saved Materials"
                  : isNotes
                    ? "Available Notes"
                    : "Available Question Papers"}
              </h2>

              {!loading && !error && (
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  {totalCount} {totalCount === 1 ? "Material" : "Materials"}
                </span>
              )}

            </div>

            {loading ? (

              <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">

                <Loader2
                  size={22}
                  className="animate-spin text-blue-600"
                />

                Loading materials...

              </div>

            ) : error ? (

              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">

                <p>{error}</p>

                <button
                  type="button"
                  onClick={() => setRetry((n) => n + 1)}
                  className="mt-3 font-semibold underline"
                >
                  Try Again
                </button>

              </div>

            ) : filtered.length === 0 ? (

              <div className="mt-4 flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center dark:border-[#30415D] dark:bg-[#0F1D38]">

                <FolderOpen
                  size={38}
                  className="text-slate-400"
                />

                <h3 className="mt-4 font-semibold">
                  {bookmarksOnly
                    ? "No saved materials found"
                    : isNotes
                      ? "No notes found"
                      : "No question papers found"}
                </h3>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {branch || semester || search || subject
                    ? "Try changing your search or filters."
                    : bookmarksOnly
                      ? "Save notes and question papers to access them here."
                      : "Faculty-uploaded materials will appear here."}
                </p>

              </div>

            ) : (

              <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">

                {visible.map((material) => (

                  <article
                    key={material.id}
                    className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#30415D] dark:bg-[#0F1D38]"
                  >

                    <div className="flex items-start gap-3">

                      <span className="shrink-0 rounded-xl bg-red-50 p-3 text-red-500 dark:bg-red-950/40">
                        <FileText size={25} />
                      </span>

                      <div className="min-w-0 flex-1">

                        <h3 className="break-words text-sm font-semibold leading-6">
                          {material.title}
                        </h3>

                        <p className="mt-1 break-words text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {material.subject_name}
                        </p>

                      </div>

                      <button
                        type="button"
                        disabled={!bookmarksReady || bookmarkBusy !== null}
                        aria-label={
                          bookmarkIds.has(material.id)
                            ? "Remove bookmark"
                            : "Save bookmark"
                        }
                        aria-pressed={bookmarkIds.has(material.id)}
                        title={
                          bookmarkIds.has(material.id)
                            ? "Remove bookmark"
                            : "Save bookmark"
                        }
                        onClick={() => void toggleBookmark(material)}
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors disabled:opacity-50 ${
                          bookmarkIds.has(material.id)
                            ? "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : "border-slate-200 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:border-[#30415D] dark:hover:bg-[#223553]"
                        }`}
                      >
                        {bookmarkBusy === material.id ? (
                          <Loader2 size={19} className="animate-spin" />
                        ) : (
                          <Bookmark
                            size={19}
                            fill={
                              bookmarkIds.has(material.id)
                                ? "currentColor"
                                : "none"
                            }
                          />
                        )}
                      </button>

                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">

                      <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {material.branch}
                      </span>

                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-[#17243B] dark:text-slate-300">
                        Semester {material.semester}
                      </span>

                      {bookmarksOnly && (
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-[#17243B] dark:text-slate-300">
                          {material.material_type === "notes"
                            ? "Notes"
                            : "Question Paper"}
                        </span>
                      )}

                    </div>

                    <div className="mt-auto pt-4">

                      <button
                        type="button"
                        disabled={opening !== null}
                        onClick={() => void openPDF(material)}
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-950 dark:text-blue-300"
                      >

                        {opening === material.id
                          ? <Loader2
                              size={18}
                              className="animate-spin"
                            />
                          : <Eye size={18} />}

                        {opening === material.id
                          ? "Opening..."
                          : "View PDF"}

                      </button>

                    </div>

                  </article>

                ))}

              </div>

            )}

            {bookmarkError && (
              <div
                role="alert"
                className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300"
              >
                <p>{bookmarkError}</p>
                <button
                  type="button"
                  onClick={() => {
                    retryBookmarks();
                    if (bookmarksOnly) {
                      setRetry((n) => n + 1);
                    }
                  }}
                  className="mt-2 font-semibold underline"
                >
                  Retry
                </button>
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

            {/* Pagination */}

            {!loading && !error && totalPages > 1 && (

              <div className="mt-6 flex items-center justify-center gap-4">

                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                  className="rounded-xl border border-slate-200 bg-white p-3 disabled:opacity-40 dark:border-[#30415D] dark:bg-[#0F1D38]"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={19} />
                </button>

                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                  className="rounded-xl border border-slate-200 bg-white p-3 disabled:opacity-40 dark:border-[#30415D] dark:bg-[#0F1D38]"
                  aria-label="Next page"
                >
                  <ChevronRight size={19} />
                </button>

              </div>

            )}

          </section>

        </div>

      </main>

      {/* Responsive PDF Preview */}

      {preview && (

        <div
          role="dialog"
          aria-modal="true"
          aria-label="PDF Preview"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 sm:p-6"
        >

          <div className="flex h-dvh min-w-0 w-full max-w-6xl flex-col overflow-hidden bg-white dark:bg-[#0F1D38] sm:h-[92dvh] sm:rounded-2xl">

            <header className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-[#30415D]">

              <div className="min-w-0">

                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  PDF Preview
                </p>

                <h2 className="mt-1 truncate text-sm font-semibold">
                  {preview.title}
                </h2>

              </div>

              <button
                type="button"
                autoFocus
                onClick={() => setPreview(null)}
                aria-label="Close PDF"
                className="shrink-0 rounded-xl p-3 hover:bg-slate-100 dark:hover:bg-[#223553]"
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
