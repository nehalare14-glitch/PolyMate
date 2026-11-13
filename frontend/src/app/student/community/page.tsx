"use client";

import { useEffect, useState, useCallback } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { getAuth } from "firebase/auth";

import "@/lib/firebase";
import StudentSidebar from "@/components/student/StudentSidebar";

import {
  BookOpen,
  MessageSquare,
  Flag,
  Headphones,
  Bell,
  ClipboardList,
  Send,
  RefreshCw,
  FileText,
} from "lucide-react";

type Category = "materials" | "feedback" | "issue" | "support";

type Ticket = {
  id: string;
  ticket_number: string;
  category: Category;
  title: string;
  description: string;
  status: string;
  branch: string | null;
  semester: number | null;
  subject_name: string | null;
  material_type: string | null;
  material_id: string | null;
  admin_response: string | null;
  created_at: string;
};

type Notification = {
  id: string;
  request_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type RequestEvent = {
  id: string;
  event_type: string;
  message: string;
  created_at: string;
};

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://polymate-1.onrender.com"
).replace(/\/+$/, "");

const categories = [
  {
    id: "materials" as const,
    title: "Request Materials",
    description: "Request notes or question papers",
    Icon: BookOpen,
  },
  {
    id: "feedback" as const,
    title: "Feedback",
    description: "Share your suggestions",
    Icon: MessageSquare,
  },
  {
    id: "issue" as const,
    title: "Report Issue",
    description: "Report a problem with PolyMate",
    Icon: Flag,
  },
  {
    id: "support" as const,
    title: "Get Support",
    description: "Get help from the PolyMate team",
    Icon: Headphones,
  },
];

const branches = [
  "CSE", "ECE", "EEE", "MEC",
  "CIVIL", "AIML", "CCP",
];

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const card =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#30415D] dark:bg-[#0F1D38]";

const field =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-[#30415D] dark:bg-[#17243B] dark:text-white";

const primary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50";

async function communityApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {

  const auth = getAuth();

  await auth.authStateReady();

  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in again.");
  }

  const token = await user.getIdToken();

  const response = await fetch(
    `${API_BASE}/api/student/community${path}`,
    {
      ...options,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Unable to process your request."
    );
  }

  return data as T;
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function StudentCommunityPage() {

  const [tab, setTab] = useState<
    "new" | "requests" | "notifications"
  >("new");

  const [category, setCategory] =
    useState<Category>("materials");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [branch, setBranch] = useState("CSE");
  const [semester, setSemester] = useState("1");
  const [subject, setSubject] = useState("");

  const [materialType, setMaterialType] =
    useState("notes");

  const [tickets, setTickets] =
    useState<Ticket[]>([]);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [unread, setUnread] = useState(0);

  const [selected, setSelected] =
    useState<Ticket | null>(null);

  const [events, setEvents] =
    useState<RequestEvent[]>([]);

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [requestPage, setRequestPage] = useState(1);
  const [requestTotal, setRequestTotal] = useState(0);

  const [notificationPage, setNotificationPage] = useState(1);
  const [notificationTotal, setNotificationTotal] = useState(0);

  const loadData = useCallback(async () => {

    setLoading(true);
    setError("");

    try {

      const query = new URLSearchParams({
        page: String(requestPage),
        limit: "20",
      });

      if (statusFilter !== "all") {
        query.set("status", statusFilter);
      }

      const [requestData, notificationData] =
        await Promise.all([

          communityApi<{
            requests: Ticket[];
            total: number;
          }>(`/requests?${query}`),

          communityApi<{
            notifications: Notification[];
            unread_count: number;
            total: number;
          }>(
            `/notifications?page=${notificationPage}&limit=20`
          ),

        ]);

      setTickets(requestData.requests || []);
      setRequestTotal(requestData.total || 0);

      setNotifications(
        notificationData.notifications || []
      );

      setUnread(notificationData.unread_count || 0);
      setNotificationTotal(notificationData.total || 0);

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Community Hub."
      );

    } finally {

      setLoading(false);

    }

  }, [requestPage, notificationPage, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  async function submitRequest(event: FormEvent) {

    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {

      const payload = {
        category,
        title: title.trim(),
        description: description.trim(),

        ...(category === "materials"
          ? {
              branch,
              semester: Number(semester),
              subject_name: subject.trim(),
              material_type: materialType,
            }
          : {}),
      };

      await communityApi("/requests", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setTitle("");
      setDescription("");
      setSubject("");

      setSuccess(
        "Your request was submitted successfully."
      );

      setStatusFilter("all");
      setRequestPage(1);
      setSelected(null);
      setTab("requests");

      await loadData();

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit request."
      );

    } finally {

      setBusy(false);

    }

  }

  async function openRequest(id: string) {

    setBusy(true);
    setError("");

    try {

      const data = await communityApi<{
        request: Ticket;
        events: RequestEvent[];
      }>(`/requests/${id}`);

      setSelected(data.request);
      setEvents(data.events || []);
      setTab("requests");

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to open request."
      );

    } finally {

      setBusy(false);

    }

  }

  async function cancelRequest(id: string) {

    if (busy) return;

    if (!window.confirm(
      "Are you sure you want to cancel this request?"
    )) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {

      await communityApi(
        `/requests/${id}/cancel`,
        { method: "POST" }
      );

      setSelected(null);
      setSuccess("Request cancelled successfully.");

      await loadData();

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to cancel request."
      );

    } finally {

      setBusy(false);

    }

  }

  async function markRead(item: Notification) {

    if (busy) return;

    setBusy(true);
    setError("");

    try {

      if (!item.is_read) {

        await communityApi(
          `/notifications/${item.id}/read`,
          { method: "PATCH" }
        );

        await loadData();

      }

      await openRequest(item.request_id);

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to open notification."
      );

    } finally {

      setBusy(false);

    }

  }

  function changeTab(
    value: "new" | "requests" | "notifications"
  ) {
    setTab(value);
    setSelected(null);
    setError("");
    setSuccess("");
  }

  return (

    <div className="min-h-dvh bg-[#F6F8FC] text-slate-900 dark:bg-[#0B1220] dark:text-[#F1F5F9]">

      <StudentSidebar />

      <main className="min-h-dvh min-w-0 px-3 pb-12 pt-20 sm:px-6 md:ml-64 md:px-8 md:pt-10 xl:px-10">

        <div className="mx-auto max-w-6xl space-y-6">

          <header className="flex flex-wrap items-center justify-between gap-4">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Student Portal
              </p>

              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
                Community Hub
              </h1>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Connect with the PolyMate team.
              </p>

            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading || busy}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium dark:border-[#30415D]"
            >
              <RefreshCw size={17} />
              Refresh
            </button>

          </header>

          <section className="rounded-3xl bg-gradient-to-br from-[#102A78] to-[#2563EB] p-6 text-white sm:p-8">

            <h2 className="text-xl font-bold sm:text-2xl">
              How can we help you?
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-7 text-blue-100">
              Request study materials, share feedback or
              get support directly from the PolyMate team.
            </p>

          </section>

          <nav
            aria-label="Community sections"
            className="flex flex-wrap gap-2"
          >

            {[
              {
                id: "new" as const,
                label: "New Request",
                Icon: Send,
              },
              {
                id: "requests" as const,
                label: "My Requests",
                Icon: ClipboardList,
              },
              {
                id: "notifications" as const,
                label: `Notifications (${unread})`,
                Icon: Bell,
              },
            ].map(({ id, label, Icon }) => (

              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => changeTab(id)}
                className={`flex min-h-11 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
                  tab === id
                    ? "bg-blue-700 text-white"
                    : "border border-slate-200 bg-white text-slate-600 dark:border-[#30415D] dark:bg-[#0F1D38] dark:text-slate-300"
                }`}
              >
                <Icon size={17} />
                {label}
              </button>

            ))}

          </nav>

          {error && (

            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>

          )}

          {success && (

            <div
              role="status"
              className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
            >
              {success}
            </div>

          )}

          {tab === "new" && (

            <>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

                {categories.map(
                  ({ id, title, description, Icon }) => (

                    <button
                      key={id}
                      type="button"
                      aria-pressed={category === id}
                      onClick={() => setCategory(id)}
                      className={`rounded-2xl border bg-white p-5 text-left dark:bg-[#0F1D38] ${
                        category === id
                          ? "border-blue-500 ring-1 ring-blue-500"
                          : "border-slate-200 dark:border-[#30415D]"
                      }`}
                    >

                      <span className="inline-flex rounded-xl bg-blue-50 p-3 text-blue-700 dark:bg-[#172B4C] dark:text-blue-400">
                        <Icon size={24} />
                      </span>

                      <h3 className="mt-4 font-semibold">
                        {title}
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {description}
                      </p>

                    </button>

                  )
                )}

              </div>

              <form
                onSubmit={submitRequest}
                className={`${card} space-y-5`}
              >

                <h2 className="text-lg font-bold">

                  {
                    categories.find(
                      (item) => item.id === category
                    )?.title
                  }

                </h2>

                {category === "materials" && (

                  <div className="grid gap-4 sm:grid-cols-2">

                    <label className="text-sm font-medium">
                      Branch

                      <select
                        value={branch}
                        onChange={(e) => {
                          setBranch(e.target.value);
                          setSubject("");
                        }}
                        className={field}
                      >

                        {branches.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}

                      </select>

                    </label>

                    <label className="text-sm font-medium">
                      Semester

                      <select
                        value={semester}
                        onChange={(e) => {
                          setSemester(e.target.value);
                          setSubject("");
                        }}
                        className={field}
                      >

                        {[1, 2, 3, 4, 5, 6].map(
                          (item) => (
                            <option key={item} value={item}>
                              Semester {item}
                            </option>
                          )
                        )}

                      </select>

                    </label>

                    <label className="text-sm font-medium">
                      Subject Name

                      <input
                        required
                        minLength={2}
                        maxLength={150}
                        value={subject}
                        onChange={(e) =>
                          setSubject(e.target.value)
                        }
                        placeholder="Enter exact subject name"
                        className={field}
                      />

                    </label>

                    <label className="text-sm font-medium">
                      Material Type

                      <select
                        value={materialType}
                        onChange={(e) =>
                          setMaterialType(e.target.value)
                        }
                        className={field}
                      >
                        <option value="notes">
                          Subject Notes
                        </option>
                        <option value="question-paper">
                          Question Papers
                        </option>
                      </select>

                    </label>

                  </div>

                )}

                <label className="block text-sm font-medium">
                  Title

                  <input
                    required
                    minLength={3}
                    maxLength={150}
                    value={title}
                    onChange={(e) =>
                      setTitle(e.target.value)
                    }
                    placeholder="Enter a short title"
                    className={field}
                  />

                </label>

                <label className="block text-sm font-medium">
                  Description

                  <textarea
                    required
                    minLength={10}
                    maxLength={2000}
                    rows={5}
                    value={description}
                    onChange={(e) =>
                      setDescription(e.target.value)
                    }
                    placeholder="Explain your request in detail..."
                    className={`${field} resize-y`}
                  />

                  <span className="mt-1 block text-right text-xs text-slate-500">
                    {description.length}/2000
                  </span>

                </label>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your request is private and will be
                  reviewed by the PolyMate team. Do not
                  include passwords or sensitive information.
                </p>

                <button
                  type="submit"
                  disabled={busy}
                  className={primary}
                >
                  <Send size={17} />
                  {busy ? "Submitting..." : "Submit Request"}
                </button>

              </form>

            </>

          )}

          {tab === "requests" && (

            <section className="space-y-4">

              <div className="flex flex-wrap items-center justify-between gap-3">

                <h2 className="text-lg font-bold">
                  My Requests
                </h2>

                <select
                  aria-label="Filter requests by status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setRequestPage(1);
                    setSelected(null);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm dark:border-[#30415D] dark:bg-[#0F1D38]"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

              </div>

              {selected ? (

                <article className={`${card} space-y-4`}>

                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="text-sm font-semibold text-blue-600 dark:text-blue-400"
                  >
                    Back to requests
                  </button>

                  <div className="flex flex-wrap items-center justify-between gap-2">

                    <h3 className="text-lg font-bold">
                      {selected.title}
                    </h3>

                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[selected.status] || ""}`}>
                      {statusLabels[selected.status] || selected.status}
                    </span>

                  </div>

                  <p className="text-xs text-slate-500">
                    {selected.ticket_number} · {dateLabel(selected.created_at)}
                  </p>

                  <p className="whitespace-pre-wrap break-words text-sm leading-7">
                    {selected.description}
                  </p>

                  {selected.category === "materials" && (

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {selected.branch} · Semester {selected.semester} · {selected.subject_name}
                    </p>

                  )}

                  {selected.admin_response && (

                    <div className="rounded-xl bg-blue-50 p-4 dark:bg-[#172B4C]">

                      <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                        PolyMate Team Response
                      </p>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                        {selected.admin_response}
                      </p>

                    </div>

                  )}

                  {selected.status === "completed" &&
                    selected.material_id && (

                    <Link
                      href={
                        selected.material_type === "question-paper"
                          ? "/student/question-papers"
                          : "/student/notes"
                      }
                      className={primary}
                    >
                      <FileText size={17} />
                      Browse Requested Materials
                    </Link>

                  )}

                  {selected.status === "pending" && (

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void cancelRequest(selected.id)
                      }
                      className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 dark:border-red-900 dark:text-red-400"
                    >
                      Cancel Request
                    </button>

                  )}

                  <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-[#30415D]">

                    <h3 className="font-semibold">
                      Request History
                    </h3>

                    {events.map((event) => (

                      <div
                        key={event.id}
                        className="border-l-2 border-blue-500 pl-4"
                      >

                        <p className="text-sm font-medium">
                          {event.message}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {dateLabel(event.created_at)}
                        </p>

                      </div>

                    ))}

                  </div>

                </article>

              ) : (

                <>

                  {loading ? (

                    <p className={card}>
                      Loading requests...
                    </p>

                  ) : tickets.length === 0 ? (

                    <div className={`${card} text-center`}>

                      <ClipboardList
                        size={36}
                        className="mx-auto text-slate-400"
                      />

                      <h3 className="mt-3 font-semibold">
                        No requests found
                      </h3>

                      <p className="mt-2 text-sm text-slate-500">
                        Submit a request to get started.
                      </p>

                    </div>

                  ) : tickets.map((item) => (

                    <button
                      key={item.id}
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void openRequest(item.id)
                      }
                      className={`${card} w-full space-y-3 text-left hover:border-blue-400`}
                    >

                      <div className="flex flex-wrap items-center justify-between gap-2">

                        <h3 className="font-semibold">
                          {item.title}
                        </h3>

                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[item.status] || ""}`}>
                          {statusLabels[item.status] || item.status}
                        </span>

                      </div>

                      <p className="text-xs text-slate-500">
                        {item.ticket_number} · {dateLabel(item.created_at)}
                      </p>

                      <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                        {item.description}
                      </p>

                    </button>

                  ))}

                  <div className="flex items-center justify-between gap-3">

                    <button
                      type="button"
                      disabled={requestPage === 1 || loading}
                      onClick={() =>
                        setRequestPage((p) => p - 1)
                      }
                      className="rounded-xl border px-4 py-2 text-sm disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <span className="text-sm text-slate-500">
                      Page {requestPage}
                    </span>

                    <button
                      type="button"
                      disabled={requestPage * 20 >= requestTotal || loading}
                      onClick={() =>
                        setRequestPage((p) => p + 1)
                      }
                      className="rounded-xl border px-4 py-2 text-sm disabled:opacity-40"
                    >
                      Next
                    </button>

                  </div>

                </>

              )}

            </section>

          )}

          {tab === "notifications" && (

            <section className="space-y-4">

              <h2 className="text-lg font-bold">
                Notifications
              </h2>

              {loading ? (

                <p className={card}>
                  Loading notifications...
                </p>

              ) : notifications.length === 0 ? (

                <div className={`${card} text-center`}>

                  <Bell
                    size={36}
                    className="mx-auto text-slate-400"
                  />

                  <h3 className="mt-3 font-semibold">
                    No notifications yet
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    Updates about your requests will appear here.
                  </p>

                </div>

              ) : notifications.map((item) => (

                <button
                  key={item.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void markRead(item)}
                  className={`${card} w-full text-left ${
                    !item.is_read ? "border-blue-400" : ""
                  }`}
                >

                  <div className="flex items-start gap-3">

                    <span className="rounded-xl bg-blue-50 p-3 text-blue-700 dark:bg-[#172B4C] dark:text-blue-400">
                      <Bell size={20} />
                    </span>

                    <div className="min-w-0 flex-1">

                      <div className="flex items-center justify-between gap-2">

                        <h3 className="font-semibold">
                          {item.title}
                        </h3>

                        {!item.is_read && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                        )}

                      </div>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">
                        {item.message}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        {dateLabel(item.created_at)}
                      </p>

                    </div>

                  </div>

                </button>

              ))}

              <div className="flex items-center justify-between gap-3">

                <button
                  type="button"
                  disabled={notificationPage === 1 || loading}
                  onClick={() =>
                    setNotificationPage((p) => p - 1)
                  }
                  className="rounded-xl border px-4 py-2 text-sm disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="text-sm text-slate-500">
                  Page {notificationPage}
                </span>

                <button
                  type="button"
                  disabled={notificationPage * 20 >= notificationTotal || loading}
                  onClick={() =>
                    setNotificationPage((p) => p + 1)
                  }
                  className="rounded-xl border px-4 py-2 text-sm disabled:opacity-40"
                >
                  Next
                </button>

              </div>

            </section>

          )}

          <footer className="text-center text-xs text-slate-400">
            PolyMate Student Portal
          </footer>

        </div>

      </main>

    </div>

  );

}
