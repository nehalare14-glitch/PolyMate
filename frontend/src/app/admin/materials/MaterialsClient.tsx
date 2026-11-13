"use client";

import PDFViewer from "@/components/shared/PDFViewerDynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import ThemeToggle from "@/components/theme/ThemeToggle";

import {
  LayoutDashboard, FileText, Settings, LogOut,
  Menu, X, Search, RefreshCw, Eye, Pencil,
  EyeOff, Trash2, RotateCcw, CheckCircle2,
  ChevronLeft, ChevronRight, History, Library
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000";

const branches = [
  "CSE", "ECE", "EEE", "MEC", "CIVIL", "AIML", "CCP"
];

const types = [
  "notes", "question-paper", "syllabus", "lab-manual"
];

type Material = {
  id: string;
  title: string;
  subject_name: string;
  branch: string;
  semester: number;
  material_type: string;
  status: "published" | "hidden" | "trash";
  uploaded_by_name: string;
  created_at: string;
};

type Stats = {
  total: number;
  published: number;
  hidden: number;
  trash: number;
};

type Activity = {
  id: string;
  material_title: string;
  action: string;
  actor_role: string;
  created_at: string;
};

type EditForm = {
  title: string;
  subject_name: string;
  branch: string;
  semester: number;
  material_type: string;
};

const card =
  "rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900";

const field =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800";

const btn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800";

const primary =
  "rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50";

async function request<T>(
  path: string,
  method = "GET",
  body?: object
): Promise<T> {
  const user = auth.currentUser;

  if (!user) throw new Error("Please log in again.");

  const token = await user.getIdToken();

  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || `Request failed (${response.status})`
    );
  }

  return data as T;
}

export default function MaterialsClient() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("all");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState<EditForm>({
    title: "",
    subject_name: "",
    branch: "CSE",
    semester: 1,
    material_type: "notes",
  });

  const [preview, setPreview] = useState<{
    title: string;
    url: string;
  } | null>(null);

  const [tab, setTab] =
    useState<"materials" | "activity">("materials");

  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);

  useEffect(() => {
    return auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setReady(true);
    });
  }, [router]);

  const load = useCallback(async () => {
    if (!ready) return;

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status,
      });

      if (query) params.set("search", query);
      if (branch) params.set("branch", branch);
      if (semester) params.set("semester", semester);
      if (type) params.set("material_type", type);

      const [list, counts] = await Promise.all([
        request<{ materials: Material[]; total: number }>(
          `/api/admin/materials?${params}`
        ),
        request<Stats>("/api/admin/materials/stats"),
      ]);

      setMaterials(list.materials);
      setTotal(list.total);
      setStats(counts);

      const lastPage = Math.max(1, Math.ceil(list.total / limit));
      if (page > lastPage) setPage(lastPage);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load materials.");
    } finally {
      setLoading(false);
    }
  }, [ready, page, status, query, branch, semester, type]);

  const loadActivity = useCallback(async () => {
    if (!ready) return;

    setLoading(true);
    setError("");

    try {
      const result = await request<{
        activities: Activity[];
        total: number;
      }>(
        `/api/admin/materials/activity?page=${activityPage}&limit=20`
      );

      setActivities(result.activities);
      setActivityTotal(result.total);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load activity.");
    } finally {
      setLoading(false);
    }
  }, [ready, activityPage]);

  useEffect(() => {
    if (tab === "materials") void load();
    else void loadActivity();
  }, [tab, load, loadActivity]);

  async function perform(operation: () => Promise<void>) {
    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await operation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(material: Material) {
    setEditing(material);
    setForm({
      title: material.title,
      subject_name: material.subject_name,
      branch: material.branch,
      semester: material.semester,
      material_type: material.material_type,
    });
  }

  function saveEdit() {
    if (!editing) return;

    void perform(async () => {
      const result = await request<{ message: string }>(
        `/api/admin/materials/${editing.id}`,
        "PATCH",
        form
      );

      setEditing(null);
      setMessage(result.message);
      await load();
    });
  }

  function openPreview(material: Material) {
    void perform(async () => {
      const result = await request<{
        title: string;
        url: string;
      }>(`/api/admin/materials/${material.id}/preview`);

      setPreview(result);
    });
  }

  function changeStatus(material: Material, action: string) {
    if (!window.confirm(`${action.toUpperCase()}: ${material.title}?`)) {
      return;
    }

    void perform(async () => {
      const result = await request<{ message: string }>(
        `/api/admin/materials/${material.id}/status`,
        "PATCH",
        { action }
      );

      setMessage(result.message);
      await load();
    });
  }

  function clearFilters() {
    setSearch("");
    setQuery("");
    setBranch("");
    setSemester("");
    setType("");
    setStatus("all");
    setPage(1);
  }

  function logout() {
    void perform(async () => {
      await signOut(auth);
      router.replace("/login");
    });
  }

  const navigation = [
    { name: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Study Materials", href: "/admin/materials", icon: FileText },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:translate-x-0 ${
        sidebar ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-6 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-blue-600">PolyMate</h2>
            <p className="text-xs text-slate-500">Admin Console</p>
          </div>
          <button className="lg:hidden" onClick={() => setSidebar(false)} aria-label="Close navigation">
            <X size={22} />
          </button>
        </div>

        <nav className="space-y-1 p-4">
          {navigation.map(({ name, href, icon: Icon }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                href === "/admin/materials"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}>
              <Icon size={19} /> {name}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full border-t border-slate-200 p-4 dark:border-slate-700">
          <button onClick={logout} disabled={busy}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50">
            <LogOut size={19} /> Log Out
          </button>
        </div>
      </aside>

      {sidebar && (
        <button onClick={() => setSidebar(false)}
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden" />
      )}

      <div className="lg:ml-64">
        <header className="flex min-h-20 items-center justify-between border-b border-slate-200 bg-white px-5 dark:border-slate-700 dark:bg-slate-900 md:px-8">
          <div className="flex items-center gap-4">
            <button className="lg:hidden" onClick={() => setSidebar(true)} aria-label="Open navigation">
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold">Study Materials</h1>
              <p className="text-xs text-slate-500">Admin workspace</p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <main className="mx-auto max-w-7xl space-y-6 p-3 sm:p-5 md:p-8">

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Materials Management</h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage study materials uploaded by faculty.
              </p>
            </div>
            <button className={btn} disabled={loading || busy}
              onClick={() => tab === "materials" ? void load() : void loadActivity()}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          {error && (
            <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-4 xl:grid-cols-4">
            {[
              { label: "Total Materials", value: stats?.total, icon: Library, filter: "all" },
              { label: "Published", value: stats?.published, icon: CheckCircle2, filter: "published" },
              { label: "Hidden", value: stats?.hidden, icon: EyeOff, filter: "hidden" },
              { label: "Trash", value: stats?.trash, icon: Trash2, filter: "trash" },
            ].map(({ label, value, icon: Icon, filter }) => (
              <button key={label} className={`${card} text-left`}
                onClick={() => { setStatus(filter); setPage(1); setTab("materials"); }}>
                <Icon size={23} className="text-blue-600" />
                <p className="mt-4 text-3xl font-bold">{value ?? "-"}</p>
                <p className="mt-1 text-sm text-slate-500">{label}</p>
              </button>
            ))}
          </div>

          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
            <button onClick={() => setTab("materials")}
              className={`px-4 py-3 text-sm font-semibold ${tab === "materials" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500"}`}>
              All Materials
            </button>
            <button onClick={() => setTab("activity")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold ${tab === "activity" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500"}`}>
              <History size={17} /> Activity History
            </button>
          </div>

          {tab === "materials" && (
            <>
              <section className={card}>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  setQuery(search.trim());
                  setPage(1);
                }} className="flex gap-2">
                  <input className={field} placeholder="Search title or subject..."
                    aria-label="Search materials"
                    maxLength={100}
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                  <button className={primary} type="submit">
                    <Search size={18} />
                  </button>
                </form>

                <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <select className={field} aria-label="Branch" value={branch}
                    onChange={(e) => { setBranch(e.target.value); setPage(1); }}>
                    <option value="">All Branches</option>
                    {branches.map(b => <option key={b}>{b}</option>)}
                  </select>

                  <select className={field} aria-label="Semester" value={semester}
                    onChange={(e) => { setSemester(e.target.value); setPage(1); }}>
                    <option value="">All Semesters</option>
                    {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>

                  <select className={field} aria-label="Material type" value={type}
                    onChange={(e) => { setType(e.target.value); setPage(1); }}>
                    <option value="">All Types</option>
                    {types.map(t => <option key={t} value={t}>{t.replace("-", " ")}</option>)}
                  </select>

                  <select className={field} aria-label="Status" value={status}
                    onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                    <option value="all">Active Materials</option>
                    <option value="published">Published</option>
                    <option value="hidden">Hidden</option>
                    <option value="trash">Trash</option>
                  </select>
                </div>

                <button onClick={clearFilters} className="mt-4 text-sm font-medium text-blue-600">
                  Clear Filters
                </button>
              </section>

              <section className={`${card} overflow-hidden`}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold">Materials</h3>
                  <span className="text-sm text-slate-500">{total} results</span>
                </div>

                {loading ? (
                  <p className="py-10 text-center text-sm text-slate-500">Loading materials...</p>
                ) : materials.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">No materials found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left text-sm">
                      <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                        <tr>
                          {["Material", "Branch", "Uploader", "Status", "Actions"].map(h => (
                            <th key={h} className="p-3 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {materials.map(m => (
                          <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="p-3">
                              <p className="font-semibold">{m.title}</p>
                              <p className="mt-1 text-xs text-slate-500">{m.subject_name}</p>
                              <p className="text-xs text-slate-400">
                                {m.material_type} - {new Date(m.created_at).toLocaleDateString("en-IN")}
                              </p>
                            </td>
                            <td className="p-3">
                              {m.branch}
                              <p className="text-xs text-slate-500">Sem {m.semester}</p>
                            </td>
                            <td className="p-3">{m.uploaded_by_name || "Unknown"}</td>
                            <td className="p-3">
                              <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                                m.status === "published"
                                  ? "bg-green-100 text-green-700"
                                  : m.status === "hidden"
                                  ? "bg-slate-100 text-slate-700"
                                  : "bg-red-100 text-red-700"
                              }`}>{m.status}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-2">
                                <button className={btn} disabled={busy} title="Preview" aria-label="Preview PDF" onClick={() => openPreview(m)}>
                                  <Eye size={16} />
                                </button>

                                {m.status !== "trash" && (
                                  <button className={btn} disabled={busy} title="Edit" aria-label="Edit material" onClick={() => openEdit(m)}>
                                    <Pencil size={16} />
                                  </button>
                                )}

                                {m.status === "published" && (
                                  <button className={btn} disabled={busy} onClick={() => changeStatus(m, "hide")}>
                                    <EyeOff size={16} /> Hide
                                  </button>
                                )}

                                {m.status === "hidden" && (
                                  <button className={btn} disabled={busy} onClick={() => changeStatus(m, "publish")}>
                                    <CheckCircle2 size={16} /> Publish
                                  </button>
                                )}

                                {m.status !== "trash" ? (
                                  <button className={`${btn} text-red-600`} disabled={busy} title="Move to Trash" aria-label="Move to Trash"
                                    onClick={() => changeStatus(m, "trash")}>
                                    <Trash2 size={16} />
                                  </button>
                                ) : (
                                  <button className={btn} disabled={busy} onClick={() => changeStatus(m, "restore")}>
                                    <RotateCcw size={16} /> Restore
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between">
                  <button className={btn} disabled={page <= 1 || loading || busy} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <span className="text-sm text-slate-500">
                    Page {page} of {Math.max(1, Math.ceil(total / limit))}
                  </span>
                  <button className={btn} disabled={page * limit >= total || loading || busy} onClick={() => setPage(p => p + 1)}>
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </section>
            </>
          )}

          {tab === "activity" && (
            <section className={card}>
              <h3 className="mb-4 font-semibold">Activity History</h3>

              {loading ? (
                <p className="py-6 text-sm text-slate-500">Loading activity...</p>
              ) : activities.length === 0 ? (
                <p className="py-6 text-sm text-slate-500">No activity recorded.</p>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {activities.map(a => (
                    <div key={a.id} className="flex items-start gap-3 py-4">
                      <History size={19} className="mt-1 shrink-0 text-blue-600" />
                      <div className="flex-1">
                        <p className="font-medium">{a.material_title}</p>
                        <p className="text-sm capitalize text-slate-500">
                          {a.action} by {a.actor_role}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(a.created_at).toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <button className={btn} disabled={activityPage <= 1 || loading}
                  onClick={() => setActivityPage(p => p - 1)}>Previous</button>
                <span className="text-sm">Page {activityPage}</span>
                <button className={btn} disabled={activityPage * 20 >= activityTotal || loading}
                  onClick={() => setActivityPage(p => p + 1)}>Next</button>
              </div>
            </section>
          )}
        </main>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <form role="dialog" aria-modal="true" aria-label="Edit material"
            onSubmit={(e) => { e.preventDefault(); saveEdit(); }}
            className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-6 dark:bg-slate-900">

            <h2 className="text-xl font-bold">Edit Material</h2>

            <label className="block text-sm font-medium">
              Title
              <input required maxLength={120} className={`mt-1 ${field}`}
                value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
            </label>

            <label className="block text-sm font-medium">
              Subject
              <input required maxLength={100} className={`mt-1 ${field}`}
                value={form.subject_name} onChange={(e) => setForm(f => ({ ...f, subject_name: e.target.value }))} />
            </label>

            <label className="block text-sm font-medium">
              Branch
              <select className={`mt-1 ${field}`} value={form.branch}
                onChange={(e) => setForm(f => ({ ...f, branch: e.target.value }))}>
                {branches.map(b => <option key={b}>{b}</option>)}
              </select>
            </label>

            <label className="block text-sm font-medium">
              Semester
              <select className={`mt-1 ${field}`} value={form.semester}
                onChange={(e) => setForm(f => ({ ...f, semester: Number(e.target.value) }))}>
                {[1,2,3,4,5,6].map(s => <option key={s}>{s}</option>)}
              </select>
            </label>

            <label className="block text-sm font-medium">
              Material Type
              <select className={`mt-1 ${field}`} value={form.material_type}
                onChange={(e) => setForm(f => ({ ...f, material_type: e.target.value }))}>
                {types.map(t => <option key={t}>{t}</option>)}
              </select>
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" className={btn} disabled={busy}
                onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className={primary} disabled={busy}>
                {busy ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 md:p-6">
          <section role="dialog" aria-modal="true" aria-label="PDF preview"
            className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
              <h2 className="truncate font-semibold">{preview.title}</h2>
              <button className={btn} onClick={() => setPreview(null)}>
                <X size={19} /> Close
              </button>
            </div>
            <PDFViewer
              url={preview.url}
              title={preview.title}
            />
          </section>
        </div>
      )}
    </div>
  );
}



