"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  subscribeSmartSync,
  notifySmartSync,
} from "@/lib/smart-sync";
import { auth } from "@/lib/firebase";
import {
  Users, ShieldCheck, Mail, UserX,
  Search, RefreshCw, Eye, X,
  ChevronLeft, ChevronRight, ArrowLeft, Trash2
} from "lucide-react";

type Student = {
  uid: string;
  full_name: string | null;
  email: string;
  institution_id: number | null;
  institution_name: string | null;
  college_code: string | null;
  district: string | null;
  management: string | null;
  created_at: string | null;
  email_verified: boolean | null;
  account_status: string;
};

type Institution = {
  id: number;
  name: string;
  district: string;
  college_code: string;
};

type Stats = {
  total: number;
  verified: number;
  unverified: number;
  suspended: number;
  missing: number;
};

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:5000";

const card =
  "rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900";

const field =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800";

const btn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800";

function formatDate(value: string | null) {
  if (!value) return "Not available";

  return new Date(value).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "short", year: "numeric" }
  );
}

export default function StudentsClient() {
  const [students, setStudents] = useState<Student[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    verified: 0,
    unverified: 0,
    suspended: 0,
    missing: 0
  });

  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("");
  const [institution, setInstitution] = useState("");
  const [verification, setVerification] = useState("");
  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  const [selected, setSelected] = useState<Student | null>(null);

  const [removing, setRemoving] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkResult, setBulkResult] = useState("");

  const limit = 15;

  const allSelected =
    students.length > 0 &&
    students.every(s => selectedIds.includes(s.uid));

  function toggleStudent(uid: string) {
    setSelectedIds(previous =>
      previous.includes(uid)
        ? previous.filter(id => id !== uid)
        : [...previous, uid]
    );
  }

  function toggleAllStudents() {
    setSelectedIds(
      allSelected ? [] : students.map(s => s.uid)
    );
  }

  async function removeSelectedStudents() {

    if (bulkDeleting || removing !== null) return;

    const targets = students.filter(
      s => selectedIds.includes(s.uid)
    );

    if (targets.length === 0) return;

    const names = targets.map(
      s => s.full_name || s.email
    ).join("\n");

    const confirmed = window.confirm(
      `Permanently remove ${targets.length} students?\n\n` +
      names +
      "\n\nTheir login accounts, profiles, details " +
      "and bookmarks will be deleted.\n\n" +
      "This action cannot be undone."
    );

    if (!confirmed) return;

    setBulkDeleting(true);
    setBulkResult("");
    setNotice("");
    setError("");

    let removed = 0;
    const failed: string[] = [];

    try {

      const user = auth.currentUser;

      if (!user) {
        throw new Error("Please sign in as Admin.");
      }

      const token = await user.getIdToken();

      for (const student of targets) {

        try {

          const response = await fetch(
            `${API}/api/admin/students/${encodeURIComponent(student.uid)}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`
              },
              cache: "no-store"
            }
          );

          if (!response.ok) {
            const data = await response.json();

            throw new Error(
              data.error || "Removal failed."
            );
          }

          removed++;

        } catch (err) {

          failed.push(
            `${student.full_name || student.email}: ` +
            (err instanceof Error
              ? err.message
              : "Removal failed.")
          );

        }
      }

      if (failed.length === 0) {

        setBulkResult(
          `${removed} student(s) removed successfully.`
        );

      } else {

        setBulkResult(
          `${removed} removed. ${failed.length} failed.\n` +
          failed.join("\n") +
          "\nRefresh and retry any remaining accounts."
        );

      }

      setSelectedIds([]);
      setSelected(null);
      setPage(1);
      setRefresh(value => value + 1);

      if (removed > 0) {
        notifySmartSync();
      }

    } catch (err) {

      setBulkResult(
        err instanceof Error
          ? err.message
          : "Bulk removal failed."
      );

    } finally {

      setBulkDeleting(false);

    }
  }

  async function removeStudent(student: Student) {

    const confirmed = window.confirm(
      `Permanently remove ${student.full_name || "this student"}?\n\n` +
      `Email: ${student.email}\n\n` +
      "This will delete the student's login account, " +
      "profile, details and bookmarks.\n\n" +
      "This action cannot be undone."
    );

    if (!confirmed) return;

    setRemoving(student.uid);
    setError("");
    setNotice("");

    try {

      const user = auth.currentUser;

      if (!user) {
        throw new Error("Please sign in as Admin.");
      }

      const token = await user.getIdToken();

      const response = await fetch(
        `${API}/api/admin/students/${encodeURIComponent(student.uid)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          },
          cache: "no-store"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to remove student."
        );
      }

      setSelected(null);
      setNotice("Student removed successfully.");
      setPage(1);
      setRefresh(value => value + 1);
      notifySmartSync();

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove student."
      );

    } finally {
      setRemoving(null);
    }
  }

  useEffect(() => {
    let active = true;

    const controller = new AbortController();

    const unsubscribe = subscribeSmartSync(
      auth,
      async (user, initial) => {
        if (!active) return;

        if (initial) {
          setSelectedIds([]);
          setLoading(true);
        }
        setError("");

        if (!user) {
          setError("Please sign in as Admin.");
          setLoading(false);
          return;
        }

        try {
          const token = await user.getIdToken();

          const params = new URLSearchParams({
            search,
            district,
            institution,
            verification,
            status,
            page: String(page),
            limit: String(limit)
          });

          const response = await fetch(
            `${API}/api/admin/students?${params}`,
            {
              headers: {
                Authorization: `Bearer ${token}`
              },
              cache: "no-store",
              signal: controller.signal
            }
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.error || "Unable to load students."
            );
          }

          if (!active) return;

          setStudents(data.students ?? []);
          setInstitutions(data.institutions ?? []);
          setStats(data.stats);
          setTotal(data.total ?? 0);

        } catch (err) {
          if (!active) return;

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load students."
          );

        } finally {
          if (active) setLoading(false);
        }
      },
      { intervalMs: 30000 }
    );

    return () => {
      active = false;
      controller.abort();
      unsubscribe();
    };

  }, [
    search, district, institution,
    verification, status, page, refresh
  ]);

  const districts = Array.from(
    new Set(
      institutions.map(i => i.district).filter(Boolean)
    )
  ).sort();

  const collegeOptions = institutions.filter(
    i => !district || i.district === district
  );

  const totalPages = Math.max(
    1, Math.ceil(total / limit)
  );

  const statistics = [
    {
      label: "Total Students",
      value: stats.total,
      icon: Users
    },
    {
      label: "Verified",
      value: stats.verified,
      icon: ShieldCheck
    },
    {
      label: "Unverified",
      value: stats.unverified,
      icon: Mail
    },
    {
      label: "Suspended",
      value: stats.suspended,
      icon: UserX
    }
  ];

  return (
    <main className="min-h-dvh bg-slate-50 p-3 sm:p-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:p-8">

      <div className="mx-auto max-w-7xl space-y-6">

        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600"
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>
            <h1 className="text-3xl font-bold">
              Students
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              View and manage registered PolyMate students.
            </p>
          </div>

          <button
            className={btn}
            disabled={loading}
            onClick={() => setRefresh(v => v + 1)}
          >
            <RefreshCw size={17} />
            Refresh
          </button>

        </div>

        {notice && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
          >
            {notice}
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-4 lg:grid-cols-4">

          {statistics.map(({ label, value, icon: Icon }) => (
            <div key={label} className={card}>

              <Icon size={24} className="text-blue-600" />

              <p className="mt-4 text-3xl font-bold">
                {loading ? "-" : value}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {label}
              </p>

            </div>
          ))}

        </div>

        <section className={card}>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">

            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-3.5 text-slate-400"
              />

              <input
                className={`${field} pl-10`}
                placeholder="Search name, email or code..."
                aria-label="Search students"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <select
              className={field}
              aria-label="District"
              value={district}
              onChange={e => {
                setDistrict(e.target.value);
                setInstitution("");
                setPage(1);
              }}
            >
              <option value="">All Districts</option>

              {districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              className={field}
              aria-label="Institution"
              value={institution}
              onChange={e => {
                setInstitution(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Institutions</option>

              {collegeOptions.map(i => (
                <option key={i.id} value={i.id}>
                  {i.college_code} - {i.name}
                </option>
              ))}
            </select>

            <select
              className={field}
              aria-label="Email verification"
              value={verification}
              onChange={e => {
                setVerification(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Verification</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
              <option value="unknown">Unknown</option>
            </select>

            <select
              className={field}
              aria-label="Account status"
              value={status}
              onChange={e => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Account Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="missing">Missing Account</option>
            </select>

            <button
              className={btn}
              onClick={() => {
                setSearch("");
                setDistrict("");
                setInstitution("");
                setVerification("");
                setStatus("");
                setPage(1);
              }}
            >
              Clear Filters
            </button>

          </div>
        </section>

        <section className={card}>

          <div className="mb-5 flex items-center justify-between">

            <h2 className="text-lg font-semibold">
              Registered Students
            </h2>

            <span className="text-sm text-slate-500">
              {total} students
            </span>

          </div>

          {bulkResult && (
            <div
              role="status"
              className="mb-4 whitespace-pre-line rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {bulkResult}
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">

            <div className="flex items-center gap-3">

              <span className="text-sm font-medium">
                {selectedIds.length} selected
              </span>

              {selectedIds.length > 0 && (
                <button
                  type="button"
                  disabled={bulkDeleting}
                  onClick={() => setSelectedIds([])}
                  className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-40 dark:text-blue-400"
                >
                  Clear Selection
                </button>
              )}

            </div>

            <button
              type="button"
              disabled={
                selectedIds.length === 0 ||
                bulkDeleting ||
                removing !== null ||
                loading
              }
              onClick={removeSelectedStudents}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 size={16} />

              {bulkDeleting
                ? "Deleting students..."
                : `Delete Selected (${selectedIds.length})`}
            </button>

          </div>

          {loading ? (

            <p className="py-12 text-center text-sm text-slate-500">
              Loading students...
            </p>

          ) : error ? (

            <p className="py-12 text-center text-sm text-slate-500">
              Unable to load students. Try Refresh.
            </p>

          ) : students.length === 0 ? (

            <p className="py-12 text-center text-sm text-slate-500">
              No students found.
            </p>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1150px] text-left text-sm">

                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800">

                  <tr>
                    <th className="w-12 px-4 py-3 text-center">

                      <input
                        type="checkbox"
                        aria-label="Select all students on this page"
                        checked={allSelected}
                        ref={element => {
                          if (element) {
                            element.indeterminate =
                              selectedIds.length > 0 &&
                              !allSelected;
                          }
                        }}
                        disabled={
                          bulkDeleting ||
                          removing !== null ||
                          students.length === 0
                        }
                        onChange={toggleAllStudents}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
                      />

                    </th>
                    {[
                      "Student",
                      "Institution",
                      "Verification",
                      "Account",
                      "Registered",
                      "Actions"
                    ].map(h => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${h === "Actions" ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>

                </thead>

                <tbody>

                  {students.map(s => (
                    <tr
                      key={s.uid}
                      className={`border-b border-slate-100 transition-colors dark:border-slate-800 ${
                        selectedIds.includes(s.uid)
                          ? "bg-blue-50 dark:bg-blue-950/30"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >

                      <td className="w-12 px-4 py-4 text-center align-middle">

                        <input
                          type="checkbox"
                          aria-label={`Select ${s.full_name || s.email}`}
                          checked={selectedIds.includes(s.uid)}
                          disabled={
                            bulkDeleting ||
                            removing !== null
                          }
                          onChange={() => toggleStudent(s.uid)}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600"
                        />

                      </td>

                      <td className="px-4 py-4 align-middle">

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">

                            {(s.full_name || s.email || "?")
                              .charAt(0).toUpperCase()}

                          </div>

                          <div>
                            <p className="font-medium">
                              {s.full_name || "Unnamed Student"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {s.email}
                            </p>
                          </div>

                        </div>

                      </td>

                      <td className="px-4 py-4 align-middle">

                        <p>{s.institution_name || "Not assigned"}</p>

                        <p className="mt-1 text-xs text-slate-500">
                          {s.district || ""}
                        </p>

                      </td>

                      <td className="px-4 py-4 align-middle">

                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                          s.email_verified === true
                            ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}>

                          {s.email_verified === true
                            ? "Verified"
                            : s.email_verified === false
                              ? "Unverified"
                              : "Unknown"}

                        </span>

                      </td>

                      <td className="px-4 py-4 align-middle capitalize">
                        {s.account_status}
                      </td>

                      <td className="px-4 py-4 align-middle">
                        {formatDate(s.created_at)}
                      </td>

                      <td className="px-4 py-4 align-middle">

                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">

                          <button
                            type="button"
                            onClick={() => setSelected(s)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            <Eye size={15} />
                            View
                          </button>

                          <button
                            type="button"
                            disabled={bulkDeleting || removing !== null || loading}
                            onClick={() => removeStudent(s)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            <Trash2 size={15} />
                            {removing === s.uid
                              ? "Removing..."
                              : "Remove"}
                          </button>

                        </div>

                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>
          )}

          <div className="mt-5 flex items-center justify-between">

            <button
              className={btn}
              disabled={page <= 1 || loading}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={17} />
              Previous
            </button>

            <span className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </span>

            <button
              className={btn}
              disabled={page >= totalPages || loading}
              onClick={() => setPage(p => p + 1)}
            >
              Next
              <ChevronRight size={17} />
            </button>

          </div>

        </section>

      </div>

      {selected && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <section
            role="dialog"
            aria-modal="true"
            aria-label="Student profile"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 dark:bg-slate-900"
          >

            <div className="flex items-center justify-between">

              <h2 className="text-xl font-bold">
                Student Profile
              </h2>

              <button
                aria-label="Close profile"
                onClick={() => setSelected(null)}
              >
                <X size={22} />
              </button>

            </div>

            <div className="mt-6 space-y-4">

              {[
                ["Full Name", selected.full_name],
                ["Email", selected.email],
                ["Institution", selected.institution_name],
                ["College Code", selected.college_code],
                ["District", selected.district],
                ["Management", selected.management],
                [
                  "Email Verification",
                  selected.email_verified === true
                    ? "Verified"
                    : selected.email_verified === false
                      ? "Unverified"
                      : "Unknown"
                ],
                ["Account Status", selected.account_status],
                ["Registration Date", formatDate(selected.created_at)]
              ].map(([label, value]) => (

                <div key={label}>

                  <p className="text-xs text-slate-500">
                    {label}
                  </p>

                  <p className="mt-1 font-medium">
                    {value || "Not available"}
                  </p>

                </div>

              ))}

            </div>

            <button
              className={`${btn} mt-6 w-full`}
              onClick={() => setSelected(null)}
            >
              Close
            </button>

          </section>

        </div>
      )}

    </main>
  );
}
