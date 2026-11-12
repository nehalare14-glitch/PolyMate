"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  GraduationCap, ShieldCheck, Clock, UserX,
  Search, RefreshCw, Eye, Trash2, X,
  ChevronLeft, ChevronRight, ArrowLeft,
  MoreVertical, FileText, Loader2
} from "lucide-react";
import { auth } from "@/lib/firebase";

const API = process.env.NEXT_PUBLIC_API_URL
  || "http://127.0.0.1:5000";

type Faculty = {
  uid: string;
  faculty_id: string | null;
  full_name: string | null;
  email: string;
  institution_id: number | null;
  institution_name: string | null;
  district: string | null;
  branch: string | null;
  material_branches: string[];
  approval_status: string;
  status: string;
  email_verified: boolean | null;
  materials: number;
  published_materials: number;
  created_at: string;
  rejection_reason: string | null;
};

type Institution = {
  id: number;
  name: string;
  district: string;
};

type Material = {
  id: string;
  title: string;
  branch: string;
  semester: number;
  material_type: string;
  status: string;
  created_at: string;
};

type Data = {
  faculty: Faculty[];
  institutions: Institution[];
  branches: string[];
  stats: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
  };
};

type Action =
  "approve" | "reject" | "suspend" |
  "reactivate" | "remove";

const panel =
  "rounded-2xl border border-slate-200 bg-white " +
  "dark:border-slate-800 dark:bg-slate-900";

const input =
  "w-full rounded-lg border border-slate-200 " +
  "bg-white px-3 py-2.5 text-sm outline-none " +
  "focus:border-blue-500 dark:border-slate-700 " +
  "dark:bg-slate-950";

const button =
  "inline-flex items-center justify-center gap-2 " +
  "rounded-lg border border-slate-200 px-3 py-2 " +
  "text-sm font-medium hover:bg-slate-50 " +
  "disabled:opacity-40 dark:border-slate-700 " +
  "dark:hover:bg-slate-800";

const primary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm " +
  "font-medium text-white hover:bg-blue-700 " +
  "disabled:opacity-50";

const danger =
  "rounded-lg bg-red-600 px-4 py-2 text-sm " +
  "font-medium text-white hover:bg-red-700 " +
  "disabled:opacity-50";

function statusStyle(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "suspended":
    case "rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function dateLabel(value?: string | null) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-IN");
}

async function api(path: string, options: RequestInit = {}) {

  const user = auth.currentUser;

  if (!user) throw new Error("Please sign in again.");

  const token = await user.getIdToken();

  const response = await fetch(`${API}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

export default function FacultyClient() {

  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [branch, setBranch] = useState("all");
  const [institution, setInstitution] = useState("all");

  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [menu, setMenu] = useState<string | null>(null);

  const [profile, setProfile] = useState<Faculty | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showMaterials, setShowMaterials] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [confirm, setConfirm] = useState<{
    action: Action;
    ids: string[];
    name: string;
  } | null>(null);

  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const limit = 15;

  useEffect(() => {

    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async user => {

      if (!user) {
        if (!cancelled) {
          setError("Please sign in again.");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError("");

      try {
        const result = await api("/api/admin/faculty");
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unable to load faculty");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };

  }, [refresh]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("status") === "pending") {
      setStatus("pending");
    }
  }, []);

  const faculty = data?.faculty || [];

  const filtered = faculty.filter(f => {

    const q = search.trim().toLowerCase();

    const matchesSearch = [
      f.full_name, f.email, f.faculty_id,
      f.institution_name, f.district
    ].some(v => (v || "").toLowerCase().includes(q));

    return matchesSearch
      && (status === "all" ||
          (status === "pending"
            ? f.approval_status === "pending"
            : f.status === status))
      && (branch === "all" ||
          f.branch === branch ||
          f.material_branches.includes(branch))
      && (institution === "all" ||
          String(f.institution_id) === institution);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const currentPage = Math.min(page, totalPages);

  const visible = filtered.slice(
    (currentPage - 1) * limit,
    currentPage * limit
  );

  const allChecked = visible.length > 0 &&
    visible.every(f => selected.includes(f.uid));

  function resetSelection() {
    setSelected([]);
    setPage(1);
    setMenu(null);
  }

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setBranch("all");
    setInstitution("all");
    resetSelection();
  }

  function ask(action: Action, ids: string[], name: string) {
    setMenu(null);
    setReason("");
    setConfirm({ action, ids, name });
  }

  async function viewProfile(f: Faculty) {

    setProfile(f);
    setMaterials([]);
    setShowMaterials(false);
    setDetailError("");
    setDetailLoading(true);

    try {
      const result = await api(
        `/api/admin/faculty/${encodeURIComponent(f.uid)}`
      );
      setMaterials(result.materials || []);
    } catch (e) {
      setDetailError(
        e instanceof Error ? e.message : "Unable to load materials"
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function executeAction() {

    if (!confirm || busy) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {

      const { action, ids } = confirm;

      if (action === "remove" && ids.length > 1) {

        const result = await api(
          "/api/admin/faculty/bulk-remove",
          {
            method: "POST",
            body: JSON.stringify({ uids: ids })
          }
        );

        setNotice(
          `${result.removed} removed. ${result.failed} failed.`
        );

        if (result.failed) {
          setError(
            result.results
              .filter((r: { success: boolean }) => !r.success)
              .map((r: { uid: string; error: string }) =>
                `${r.uid}: ${r.error}`)
              .join(" | ")
          );
        }

      } else {

        const uid = encodeURIComponent(ids[0]);

        await api(
          `/api/admin/faculty/${uid}` +
          (action === "remove" ? "" : `/${action}`),
          {
            method: action === "remove" ? "DELETE" : "POST",
            ...(action === "reject"
              ? { body: JSON.stringify({ reason }) }
              : {})
          }
        );

        setNotice(`Faculty ${action} completed successfully.`);
      }

      setConfirm(null);
      setSelected([]);
      setProfile(null);
      setRefresh(v => v + 1);

    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
      setConfirm(null);
      setRefresh(v => v + 1);
    } finally {
      setBusy(false);
    }
  }

  const cards = [
    {
      label: "Total Faculty",
      value: data?.stats.total,
      icon: GraduationCap,
      color: "bg-blue-50 text-blue-600",
      filter: "all"
    },
    {
      label: "Active Faculty",
      value: data?.stats.active,
      icon: ShieldCheck,
      color: "bg-emerald-50 text-emerald-600",
      filter: "active"
    },
    {
      label: "Pending Approvals",
      value: data?.stats.pending,
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
      filter: "pending"
    },
    {
      label: "Suspended",
      value: data?.stats.suspended,
      icon: UserX,
      color: "bg-red-50 text-red-600",
      filter: "suspended"
    }
  ];

  return (
    <main className="min-h-screen bg-[#F6F8FC] p-4 text-slate-900
      dark:bg-[#0B1220] dark:text-slate-100 md:p-8">

      <div className="mx-auto max-w-7xl space-y-6">

        <Link href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-sm
          text-slate-500 hover:text-blue-600">
          <ArrowLeft size={16}/> Admin Dashboard
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">
              Faculty Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage faculty accounts, approvals and academic contributions.
            </p>
          </div>

          <button className={button}
            disabled={loading || busy}
            onClick={() => {
              setSelected([]);
              setRefresh(v => v + 1);
            }}>
            <RefreshCw size={16}
              className={loading ? "animate-spin" : ""}/>
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {cards.map(card => (
            <button key={card.label}
              onClick={() => {
                setStatus(card.filter);
                resetSelection();
              }}
              className={`${panel} p-5 text-left transition
                hover:border-blue-400`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-500">
                  {card.label}
                </span>
                <span className={`rounded-xl p-2.5 ${card.color}`}>
                  <card.icon size={20}/>
                </span>
              </div>
              <div className="mt-3 text-3xl font-bold">
                {card.value ?? "—"}
              </div>
            </button>
          ))}
        </div>

        {notice && (
          <div role="status" className="flex justify-between rounded-xl
            bg-emerald-50 p-4 text-sm text-emerald-700">
            {notice}
            <button onClick={() => setNotice("")}
              aria-label="Dismiss message"><X size={16}/></button>
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-xl bg-red-50
            p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className={`${panel} p-4 md:p-6`}>

          <div className="mb-5">
            <h2 className="text-lg font-semibold">Faculty Directory</h2>
            <p className="text-sm text-slate-500">
              All registered faculty members
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">

            <div className="relative">
              <Search size={17}
                className="absolute left-3 top-3 text-slate-400"/>
              <input className={`${input} pl-9`}
                placeholder="Search faculty..."
                aria-label="Search faculty"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  resetSelection();
                }}/>
            </div>

            <select className={input}
              aria-label="Filter by status"
              value={status}
              onChange={e => {
                setStatus(e.target.value);
                resetSelection();
              }}>
              <option value="all">All Status</option>
              {["active", "pending", "suspended", "rejected",
                "unverified", "missing"].map(s => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>

            <select className={input}
              aria-label="Filter by branch"
              value={branch}
              onChange={e => {
                setBranch(e.target.value);
                resetSelection();
              }}>
              <option value="all">All Branches</option>
              {data?.branches.map(b => (
                <option key={b}>{b}</option>
              ))}
            </select>

            <select className={input}
              aria-label="Filter by institution"
              value={institution}
              onChange={e => {
                setInstitution(e.target.value);
                resetSelection();
              }}>
              <option value="all">All Institutions</option>
              {data?.institutions.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          <div className="my-4 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              {filtered.length} faculty members found
            </span>
            <button onClick={clearFilters}
              className="text-sm font-medium text-blue-600">
              Clear filters
            </button>
          </div>

          {selected.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center
              justify-between gap-3 rounded-xl border border-blue-200
              bg-blue-50 p-3 text-blue-700">

              <span className="text-sm font-medium">
                {selected.length} selected
              </span>

              <div className="flex gap-2">
                <button className={button}
                  onClick={() => setSelected([])}>Clear</button>

                <button className={danger}
                  disabled={busy}
                  onClick={() => ask(
                    "remove", selected,
                    `${selected.length} faculty accounts`
                  )}>
                  Remove selected
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border
            border-slate-200 dark:border-slate-800">

            <table className="w-full min-w-[1000px] text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase
                tracking-wide text-slate-500 dark:bg-slate-800">
                <tr>
                  <th className="w-12 p-4">
                    <input type="checkbox"
                      aria-label="Select all visible faculty"
                      checked={allChecked}
                      onChange={e => setSelected(
                        e.target.checked
                          ? visible.map(f => f.uid) : []
                      )}/>
                  </th>
                  <th className="p-4">Faculty</th>
                  <th className="p-4">Institution / Branch</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">PDFs</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100
                dark:divide-slate-800">

                {loading && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <Loader2 className="mx-auto mb-2 animate-spin"
                        size={24}/>
                      Loading faculty...
                    </td>
                  </tr>
                )}

                {!loading && visible.length === 0 && (
                  <tr>
                    <td colSpan={6}
                      className="p-12 text-center text-slate-500">
                      <GraduationCap className="mx-auto mb-3"
                        size={36}/>
                      No faculty members found.
                    </td>
                  </tr>
                )}

                {!loading && visible.map(f => (
                  <tr key={f.uid}
                    className="hover:bg-slate-50/70
                    dark:hover:bg-slate-800/50">

                    <td className="p-4">
                      <input type="checkbox"
                        aria-label={`Select ${f.full_name || f.email}`}
                        checked={selected.includes(f.uid)}
                        onChange={e => setSelected(old =>
                          e.target.checked
                            ? [...old, f.uid]
                            : old.filter(id => id !== f.uid)
                        )}/>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0
                          items-center justify-center rounded-full
                          bg-blue-100 font-semibold text-blue-700">
                          {(f.full_name || f.email || "F")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold">
                            {f.full_name || "Unnamed Faculty"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {f.email}
                          </div>
                          {f.faculty_id && (
                            <div className="text-xs text-slate-400">
                              ID: {f.faculty_id}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div>{f.institution_name || "Not assigned"}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {f.branch || "Not specified"}
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`rounded-full px-2.5 py-1
                        text-xs font-medium capitalize ${statusStyle(f.status)}`}>
                        {f.status}
                      </span>
                    </td>

                    <td className="p-4 text-center font-semibold">
                      {f.materials}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className={button}
                          onClick={() => viewProfile(f)}>
                          <Eye size={15}/> View
                        </button>

                        <button className={button}
                          aria-label={`Actions for ${f.full_name}`}
                          onClick={() => setMenu(
                            menu === f.uid ? null : f.uid
                          )}>
                          <MoreVertical size={17}/>
                        </button>
                      </div>

                      {menu === f.uid && (
                        <div className="mt-2 flex flex-col items-stretch
                          gap-1 rounded-xl border border-slate-200
                          bg-white p-2 shadow-lg dark:border-slate-700
                          dark:bg-slate-900">

                          {f.status === "pending" && (
                            <>
                              <button className={button}
                                disabled={!f.email_verified}
                                onClick={() => ask(
                                  "approve", [f.uid], f.full_name || f.email
                                )}>Approve</button>

                              <button className={button}
                                onClick={() => ask(
                                  "reject", [f.uid], f.full_name || f.email
                                )}>Reject</button>
                            </>
                          )}

                          {f.status === "active" && (
                            <button className={button}
                              onClick={() => ask(
                                "suspend", [f.uid], f.full_name || f.email
                              )}>Suspend</button>
                          )}

                          {f.status === "suspended" && (
                            <button className={button}
                              onClick={() => ask(
                                "reactivate", [f.uid], f.full_name || f.email
                              )}>Reactivate</button>
                          )}

                          <button className={`${button} text-red-600`}
                            onClick={() => ask(
                              "remove", [f.uid], f.full_name || f.email
                            )}>
                            <Trash2 size={15}/> Remove
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap items-center
            justify-between gap-3">
            <span className="text-sm text-slate-500">
              Showing {filtered.length ? (currentPage - 1) * limit + 1 : 0}
              {" - "}
              {Math.min(currentPage * limit, filtered.length)}
              {" of "}{filtered.length}
            </span>

            <div className="flex items-center gap-2">
              <button className={button}
                aria-label="Previous page"
                disabled={currentPage <= 1}
                onClick={() => {
                  setPage(currentPage - 1);
                  setSelected([]);
                  setMenu(null);
                }}>
                <ChevronLeft size={16}/>
              </button>

              <span className="rounded-lg bg-blue-600 px-3
                py-2 text-sm text-white">{currentPage}</span>

              <button className={button}
                aria-label="Next page"
                disabled={currentPage >= totalPages}
                onClick={() => {
                  setPage(currentPage + 1);
                  setSelected([]);
                  setMenu(null);
                }}>
                <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        </section>
      </div>

      {profile && (
        <div className="fixed inset-0 z-50 flex items-center
          justify-center bg-black/50 p-4">

          <section role="dialog" aria-modal="true"
            aria-label="Faculty profile"
            className={`${panel} max-h-[90vh] w-full max-w-2xl
              overflow-y-auto p-6 shadow-xl`}>

            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Faculty Profile</h2>
              <button onClick={() => setProfile(null)}
                aria-label="Close profile"><X size={22}/></button>
            </div>

            <div className="my-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center
                justify-center rounded-full bg-blue-100
                text-2xl font-bold text-blue-700">
                {(profile.full_name || "F")[0].toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {profile.full_name}
                </h3>
                <p className="text-sm text-slate-500">{profile.email}</p>
                <span className={`mt-2 inline-block rounded-full
                  px-3 py-1 text-xs capitalize ${statusStyle(profile.status)}`}>
                  {profile.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5 border-y
              border-slate-200 py-5 dark:border-slate-700">

              {[
                ["Faculty ID", profile.faculty_id || "Not assigned"],
                ["Institution", profile.institution_name || "Not assigned"],
                ["Department", profile.branch || "Not specified"],
                ["District", profile.district || "Not specified"],
                ["Email Verification", profile.email_verified
                  ? "Verified" : "Not verified"],
                ["Registration Date", dateLabel(profile.created_at)],
                ["Approval", profile.approval_status],
                ["Teaching Material Branches",
                  profile.material_branches.join(", ") || "None"]
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="mt-1 text-sm font-medium capitalize">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {profile.rejection_reason && (
              <p className="mt-4 rounded-lg bg-red-50 p-3
                text-sm text-red-700">
                Rejection reason: {profile.rejection_reason}
              </p>
            )}

            <h3 className="mb-3 mt-6 font-semibold">
              Academic Contributions
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {[
                ["Total PDFs", profile.materials],
                ["Published", profile.published_materials],
                ["Other", profile.materials - profile.published_materials]
              ].map(([label, value]) => (
                <div key={label}
                  className="rounded-xl bg-slate-50 p-4 text-center
                  dark:bg-slate-800">
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-xs text-slate-500">{label}</div>
                </div>
              ))}
            </div>

            {showMaterials && (
              <div className="mt-5 space-y-2">
                <h3 className="font-semibold">Uploaded Materials</h3>

                {detailLoading && <p>Loading materials...</p>}
                {detailError && (
                  <p className="text-sm text-red-600">{detailError}</p>
                )}

                {!detailLoading && !detailError && materials.length === 0
                  && <p className="text-sm text-slate-500">
                    No uploaded materials.
                  </p>}

                {materials.map(m => (
                  <div key={m.id} className="flex items-center
                    gap-3 rounded-lg border border-slate-200 p-3
                    dark:border-slate-700">
                    <FileText className="shrink-0 text-blue-600" size={20}/>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{m.title}</div>
                      <div className="text-xs text-slate-500">
                        {m.branch} · Semester {m.semester}
                        {" · "}{m.material_type}
                      </div>
                    </div>
                    <span className="text-xs capitalize">{m.status}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button className={button}
                onClick={() => setProfile(null)}>Close</button>
              <button className={primary}
                onClick={() => setShowMaterials(v => !v)}>
                {showMaterials ? "Hide Materials" : "View Materials"}
              </button>
            </div>
          </section>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center
          justify-center bg-black/50 p-4">

          <section role="dialog" aria-modal="true"
            aria-label="Confirm faculty action"
            className={`${panel} w-full max-w-md p-6 shadow-xl`}>

            <h2 className="text-xl font-bold capitalize">
              {confirm.action} Faculty?
            </h2>

            <p className="mt-3 text-sm text-slate-500">
              Confirm {confirm.action} for {confirm.name}.
            </p>

            {confirm.action === "remove" && (
              <p className="mt-3 rounded-lg bg-red-50 p-3
                text-sm text-red-700">
                This permanently removes the faculty account.
                Uploaded study materials will be retained.
              </p>
            )}

            {confirm.action === "reject" && (
              <textarea className={`${input} mt-4`}
                rows={4}
                maxLength={500}
                placeholder="Enter rejection reason..."
                value={reason}
                onChange={e => setReason(e.target.value)}/>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button className={button}
                disabled={busy}
                onClick={() => setConfirm(null)}>Cancel</button>

              <button className={
                confirm.action === "remove" || confirm.action === "reject"
                  ? danger : primary
              }
                disabled={busy ||
                  (confirm.action === "reject" && !reason.trim())}
                onClick={executeAction}>
                {busy ? "Processing..." : "Confirm " + confirm.action}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
