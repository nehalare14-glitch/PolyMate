"use client";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileUp } from "lucide-react";
import { getBranchSubjects } from "@/data/curriculum";

export default function UploadPage() {
  const [uploadFromSubject, setUploadFromSubject] = useState(false);
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [customTitle, setCustomTitle] = useState(false);
  const [unit, setUnit] = useState("all");
  const [examMonth, setExamMonth] = useState("March");
  const [examYear, setExamYear] = useState(
    String(new Date().getFullYear())
  );
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [subject, setSubject] = useState("");
  const [type, setType] = useState("notes");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setBranch("");
        setError("Please sign in again.");
        return;
      }

      try {
        const token = await user.getIdToken();

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000"}/api/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load profile.");
        }

        if (data.user?.role !== "faculty") {
          throw new Error("Faculty access required.");
        }

        const registeredBranch = data.user.faculty_branch || "";

        setBranch(registeredBranch);
        setError(
          registeredBranch
            ? ""
            : "Your registered branch is missing from your profile."
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load faculty profile."
        );
      }
    });

    return () => unsubscribe();
  }, []);


  useEffect(() => {
    if (!branch) return;

    const params = new URLSearchParams(window.location.search);
    const requestedSemester = params.get("semester");
    const requestedCode = params.get("subjectCode");

    if (!requestedSemester || !requestedCode) return;

    const matchedSubject = getBranchSubjects(branch).find(
      (item) =>
        item.code === requestedCode &&
        item.semester === Number(requestedSemester)
    );

    if (!matchedSubject) return;

    setSemester(String(matchedSubject.semester));
    setSubject(matchedSubject.code);
    setUploadFromSubject(true);
  }, [branch]);

  const availableSubjects = getBranchSubjects(branch).filter(
    (item) => item.semester === Number(semester)
  );

  const selectedSubject = availableSubjects.find(
    (item) => item.code === subject
  );

  const generatedTitle = !selectedSubject
    ? ""
    : type === "notes"
      ? `${selectedSubject.name} - ${
          unit === "all"
            ? "Complete Notes"
            : `Unit ${unit} Notes`
        }`
      : type === "question-paper"
        ? `${selectedSubject.name} - ${examMonth} ${examYear} Question Paper`
        : type === "syllabus"
          ? `${selectedSubject.name} - C24 Syllabus`
          : type === "lab-manual"
            ? `${selectedSubject.name} - Lab Manual`
            : selectedSubject.name;

  const finalTitle = customTitle
    ? title.trim()
    : generatedTitle;

  const examYears = Array.from(
    { length: 10 },
    (_, index) => String(new Date().getFullYear() - index)
  );

  function selectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError("");

    if (selected && selected.type !== "application/pdf") {
      setFile(null);
      setError("Please select a PDF file.");
      return;
    }

    if (selected && selected.size > 20 * 1024 * 1024) {
      setFile(null);
      setError("PDF must not exceed 20 MB.");
      return;
    }

    setFile(selected);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    setSuccess("");
    setError("");

    if (!branch || !semester || !selectedSubject || !finalTitle || !file) {
      setError("Complete all fields and select a PDF.");
      return;
    }

    if (finalTitle.length > 120) {
      setError("Material title must not exceed 120 characters.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("PDF must not exceed 20 MB.");
      return;
    }

    try {
      setUploading(true);
      const user = auth.currentUser;

      if (!user) {
        setError("Please sign in again.");
        return;
      }

      const token = await user.getIdToken();

      const form = new FormData();
      form.append("semester", semester);
      form.append("subject_name", selectedSubject.name);
      form.append("subject_code", selectedSubject.code);

      form.append("title", finalTitle);
      form.append("material_type", type);
      form.append("file", file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000"}/api/faculty/materials/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: form,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "PDF upload failed.");
      }

      setSuccess("PDF uploaded successfully!");

      if (uploadFromSubject && selectedSubject) {
        const returnUrl =
          `/faculty/subjects?semester=${selectedSubject.semester}` +
          `&subjectCode=${encodeURIComponent(selectedSubject.code)}` +
          `&uploaded=1`;

        router.push(returnUrl);
        return;
      }
      setTitle("");
      setCustomTitle(false);
      setFile(null);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to upload PDF."
      );
    } finally { setUploading(false); }
  }
  return (
    <>
      <Link href="/faculty/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600">
        <ArrowLeft size={17} /> Back to Dashboard
      </Link>

      <h1 className="mt-6 text-3xl font-bold">Upload PDF</h1>
      <p className="mt-2 text-sm text-slate-500">
        Upload study materials for your registered branch.
      </p>

      <form onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">

        <div>
          <label htmlFor="branch" className="text-sm font-medium">
            Branch
          </label>
          <input
            id="branch"
            value={branch || "Loading registered branch..."}
            readOnly
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <p className="mt-2 text-xs text-slate-500">
            Branch selected during faculty registration.
          </p>
        </div>

        <div>
          <label htmlFor="semester" className="text-sm font-medium">
            Semester
          </label>
          <select
            id="semester"
            required
            value={semester}
            onChange={(e) => {
              setSemester(e.target.value);
              setCustomTitle(false);
              setSubject("");
              setError("");
              setSuccess("");
            }}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="">Select Semester</option>
            {[1, 2, 3, 4, 5].map((number) => (
              <option key={number} value={number}>
                Semester {number}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="subject" className="text-sm font-medium">
            Subject Name
          </label>
          <select
            id="subject"
            required
            value={subject}
            disabled={!branch || !semester || availableSubjects.length === 0}
            onChange={(e) => {
              setSubject(e.target.value);
              setCustomTitle(false);
              setError("");
              setSuccess("");
            }}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="">
              {!semester
                ? "Select Semester First"
                : availableSubjects.length === 0
                  ? "No Subjects Available"
                  : "Select Subject"}
            </option>

            {availableSubjects.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} - {item.name}
              </option>
            ))}
          </select>

          {semester && (
            <p className="mt-2 text-xs text-slate-500">
              {availableSubjects.length} subjects available
              in Semester {semester}.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="material-type" className="text-sm font-medium">
            Material Type
          </label>

          <select
            id="material-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setCustomTitle(false);
              setSuccess("");
            }}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="notes">Subject Notes</option>
            <option value="question-paper">Question Paper</option>
            <option value="syllabus">Syllabus</option>
            <option value="lab-manual">Lab Manual</option>
          </select>
        </div>

        {type === "notes" && (
          <div>
            <label htmlFor="unit" className="text-sm font-medium">
              Unit
            </label>

            <select
              id="unit"
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value);
                setCustomTitle(false);
              }}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="all">Complete Subject Notes</option>

              {[1, 2, 3, 4, 5, 6].map((number) => (
                <option key={number} value={number}>
                  Unit {number}
                </option>
              ))}
            </select>
          </div>
        )}

        {type === "question-paper" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="exam-month" className="text-sm font-medium">
                Exam Month
              </label>

              <select
                id="exam-month"
                value={examMonth}
                onChange={(e) => {
                  setExamMonth(e.target.value);
                  setCustomTitle(false);
                }}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {[
                  "January", "February", "March",
                  "April", "May", "June",
                  "July", "August", "September",
                  "October", "November", "December"
                ].map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="exam-year" className="text-sm font-medium">
                Exam Year
              </label>

              <select
                id="exam-year"
                value={examYear}
                onChange={(e) => {
                  setExamYear(e.target.value);
                  setCustomTitle(false);
                }}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {examYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="material-title" className="text-sm font-medium">
              Material Title
            </label>

            {selectedSubject && (
              <button
                type="button"
                onClick={() => {
                  if (customTitle) {
                    setCustomTitle(false);
                  } else {
                    setTitle(generatedTitle);
                    setCustomTitle(true);
                  }
                }}
                className="text-xs font-semibold text-blue-600"
              >
                {customTitle ? "Use Auto Title" : "Edit Title"}
              </button>
            )}
          </div>

          <input
            id="material-title"
            required
            maxLength={120}
            value={customTitle ? title : generatedTitle}
            readOnly={!customTitle}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Select a subject to generate title"
            className={`mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 ${
              customTitle
                ? "bg-transparent"
                : "bg-slate-50 dark:bg-slate-800"
            }`}
          />

          <p className="mt-2 text-xs text-slate-500">
            {customTitle
              ? "Enter your preferred material title."
              : "Title is automatically generated from your selections."}
          </p>
        </div>
        <div>
          <label htmlFor="pdf-file" className="text-sm font-medium">
            Select PDF
          </label>
          <input id="pdf-file" type="file" accept=".pdf,application/pdf"
            onChange={selectFile}
            className="mt-2 block w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700" />
          <p className="mt-2 text-xs text-slate-500">
            PDF only. Maximum 20 MB.
          </p>
        </div>

        {success && <p role="status" className="text-sm text-green-600">{success}</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={uploading || !branch || !selectedSubject || !finalTitle || !file}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">
          <FileUp size={18} /> {uploading ? "Uploading..." : "Upload PDF"}
        </button>
      </form>
    </>
  );
}










