"use client";

import { useEffect, useState } from "react";
import {
  X,
  FileText,
  UploadCloud,
  Trash2,
  Loader2,
  Pencil,
} from "lucide-react";

import { auth } from "@/lib/firebase";
import { getBranchSubjects } from "@/data/curriculum";

export type MaterialAction = "edit" | "replace" | "delete";

export type ManagedMaterial = {
  id: string;
  title: string;
  branch: string;
  semester: number;
  subject_name: string;
  subject_code?: string;
  material_type: string;
  created_at: string;
};

type Props = {
  action: MaterialAction;
  material: ManagedMaterial;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:5000";

const fieldStyle =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900";

export default function MaterialActionDialog({
  action,
  material,
  onClose,
  onSuccess,
}: Props) {
  const [title, setTitle] = useState(material.title);

  const [semester, setSemester] = useState(
    String(material.semester)
  );

  const [subject, setSubject] = useState(
    material.subject_name
  );

  const [materialType, setMaterialType] = useState(
    material.material_type
  );

  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const subjects = getBranchSubjects(
    material.branch
  ).filter(
    (item) => item.semester === Number(semester)
  );

  const heading =
    action === "edit"
      ? "Edit Material Details"
      : action === "replace"
      ? "Replace PDF"
      : "Delete Material";

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    window.addEventListener("keydown", handler);

    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [saving, onClose]);

  function selectFile(selected: File | null) {
    setError("");
    setFile(null);

    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are allowed.");
      return;
    }

    if (
      selected.size === 0 ||
      selected.size > 20 * 1024 * 1024
    ) {
      setError("PDF must be between 1 byte and 20 MB.");
      return;
    }

    setFile(selected);
  }

  async function submit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    setError("");

    if (action === "edit") {
      if (!title.trim() || !subject || !semester) {
        setError("Complete all material details.");
        return;
      }

      if (title.trim().length > 120) {
        setError("Title must not exceed 120 characters.");
        return;
      }

      if (
        !subjects.some((item) => item.name === subject)
      ) {
        setError("Select a valid subject for this semester.");
        return;
      }
    }

    if (action === "replace" && !file) {
      setError("Please select a new PDF.");
      return;
    }

    setSaving(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Please sign in again.");
      }

      const token = await user.getIdToken();

      let url =
        `${API}/api/faculty/materials/${material.id}`;

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };

      let method = "DELETE";
      let body: BodyInit | undefined;

      if (action === "edit") {
        method = "PATCH";

        headers["Content-Type"] = "application/json";

        body = JSON.stringify({
          title: title.trim(),
          semester: Number(semester),
          subject_name: subject,
          material_type: materialType,
        });
      }

      if (action === "replace") {
        method = "PUT";
        url += "/replace";

        const formData = new FormData();

        formData.append("file", file!);

        body = formData;
      }

      const response = await fetch(url, {
        method,
        headers,
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to complete operation."
        );
      }

      const message =
        data.message ||
        "Material updated successfully.";

      onSuccess(
        data.warning
          ? `${message}. ${data.warning}`
          : message
      );

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );

    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"
    >
      <form
        onSubmit={submit}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-[#17243B]"
      >
        {/* Dialog header */}
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-xl p-3 ${
                action === "delete"
                  ? "bg-red-50 text-red-600 dark:bg-red-950"
                  : "bg-blue-50 text-blue-600 dark:bg-blue-950"
              }`}
            >
              {action === "edit" ? (
                <Pencil size={21} />
              ) : action === "replace" ? (
                <UploadCloud size={21} />
              ) : (
                <Trash2 size={21} />
              )}
            </div>

            <h2 className="text-lg font-bold">
              {heading}
            </h2>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
          >
            <X size={21} />
          </button>
        </header>

        <div className="space-y-4 p-5">

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          )}

          {/* EDIT DETAILS */}
          {action === "edit" && (
            <>
              <p className="text-sm text-slate-500">
                Update your uploaded material information.
              </p>

              <div>
                <label
                  htmlFor="edit-branch"
                  className="mb-2 block text-sm font-medium"
                >
                  Branch
                </label>

                <input
                  id="edit-branch"
                  value={material.branch}
                  readOnly
                  className={`${fieldStyle} cursor-not-allowed opacity-70`}
                />
              </div>

              <div>
                <label
                  htmlFor="edit-semester"
                  className="mb-2 block text-sm font-medium"
                >
                  Semester
                </label>

                <select
                  id="edit-semester"
                  value={semester}
                  disabled={saving}
                  onChange={(event) => {
                    setSemester(event.target.value);
                    setSubject("");
                  }}
                  className={fieldStyle}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option
                      key={value}
                      value={String(value)}
                    >
                      Semester {value}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="edit-subject"
                  className="mb-2 block text-sm font-medium"
                >
                  Subject
                </label>

                <select
                  id="edit-subject"
                  value={subject}
                  disabled={saving}
                  onChange={(event) =>
                    setSubject(event.target.value)
                  }
                  className={fieldStyle}
                  required
                >
                  <option value="">
                    Select Subject
                  </option>

                  {subject &&
                    !subjects.some(
                      (item) => item.name === subject
                    ) && (
                      <option value={subject}>
                        {subject} (Current)
                      </option>
                    )}

                  {subjects.map((item) => (
                    <option
                      key={item.code}
                      value={item.name}
                    >
                      {item.code} - {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="edit-type"
                  className="mb-2 block text-sm font-medium"
                >
                  Material Type
                </label>

                <select
                  id="edit-type"
                  value={materialType}
                  disabled={saving}
                  onChange={(event) =>
                    setMaterialType(event.target.value)
                  }
                  className={fieldStyle}
                >
                  <option value="notes">
                    Subject Notes
                  </option>

                  <option value="question-paper">
                    Question Paper
                  </option>

                  <option value="syllabus">
                    Syllabus
                  </option>

                  {materialType === "lab-manual" && (
                    <option value="lab-manual">
                      Lab Manual
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="edit-title"
                  className="mb-2 block text-sm font-medium"
                >
                  Material Title
                </label>

                <input
                  id="edit-title"
                  value={title}
                  disabled={saving}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  maxLength={120}
                  required
                  className={fieldStyle}
                />

                <p className="mt-1 text-right text-xs text-slate-500">
                  {title.length}/120
                </p>
              </div>
            </>
          )}

          {/* REPLACE PDF */}
          {action === "replace" && (
            <>
              <p className="text-sm text-slate-500">
                Replace the current PDF without changing
                its material details.
              </p>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <FileText
                  size={28}
                  className="shrink-0 text-red-500"
                />

                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">
                    {material.title}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Current PDF
                  </p>
                </div>
              </div>

              <label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 p-7 text-center hover:border-blue-500 dark:border-blue-800 dark:bg-blue-950/30">
                <UploadCloud
                  size={32}
                  className="mb-3 text-blue-600"
                />

                <span className="text-sm font-semibold text-blue-600">
                  Choose New PDF
                </span>

                <span className="mt-2 text-xs text-slate-500">
                  PDF only - Maximum 20 MB
                </span>

                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  disabled={saving}
                  className="sr-only"
                  onChange={(event) =>
                    selectFile(
                      event.target.files?.[0] ?? null
                    )
                  }
                />
              </label>

              {file && (
                <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
                  <FileText
                    size={22}
                    className="shrink-0 text-green-600"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="break-all text-sm font-medium">
                      {file.name}
                    </p>

                    <p className="text-xs text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setFile(null)}
                    aria-label="Remove selected file"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              <p className="text-xs leading-relaxed text-slate-500">
                Your material title, subject, semester and
                material type will remain unchanged.
              </p>
            </>
          )}

          {/* DELETE CONFIRMATION */}
          {action === "delete" && (
            <>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Are you sure you want to delete this material?
              </p>

              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
                <FileText
                  size={26}
                  className="shrink-0 text-red-600"
                />

                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">
                    {material.title}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {material.subject_name} - Semester {material.semester}
                  </p>
                </div>
              </div>

              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                This action cannot be undone.
              </p>
            </>
          )}
        </div>

        {/* Dialog actions */}
        <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-200 p-5 dark:border-slate-700">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              saving ||
              (action === "replace" && !file)
            }
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
              action === "delete"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {saving && (
              <Loader2
                size={17}
                className="animate-spin"
              />
            )}

            {saving
              ? "Please wait..."
              : action === "edit"
              ? "Save Changes"
              : action === "replace"
              ? "Replace PDF"
              : "Delete PDF"}
          </button>
        </footer>
      </form>
    </div>
  );
}
