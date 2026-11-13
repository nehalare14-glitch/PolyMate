"use client";

import { useCallback, useEffect, useState } from "react";
import { useSmartRefresh } from "@/hooks/useSmartRefresh";
import Link from "next/link";
import { getAuth } from "firebase/auth";

import "@/lib/firebase";

import {
  ArrowLeft,
  ClipboardList,
  Bell,
  Clock,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  Send,
  FileText,
} from "lucide-react";

type Ticket = {
  id: string;
  ticket_number: string;
  student_uid: string;
  category: string;
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
  updated_at: string;
};

type UnreadSummary = {
  new_requests: number;
  unread_messages: number;
  unread_tickets: number;
};

type TicketUnread = {
  request_id: string;
  is_new: boolean;
  unread_messages: number;
};

type Summary = {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
};

type Student = {
  firebase_uid: string;
  full_name?: string;
  name?: string;
  email: string;
  institution_id: number | null;
};

type Event = {
  id: string;
  event_type: string;
  message: string;
  created_at: string;
};

type Detail = {
  request: Ticket;
  student: Student | null;
  events: Event[];
};

type Message = {
  id: string;
  sender_role: "student" | "admin";
  message: string;
  message_type?: "reply" | "resolution";
  created_at: string;
};

type Material = {
  id: string;
  title: string;
  subject_name: string;
  material_type: string;
};

const API = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://polymate-1.onrender.com"
).replace(/\/+$/, "");

const card =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#30415D] dark:bg-[#1C2739]";

const field =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-[#30415D] dark:bg-[#17243B] dark:text-white";

const primary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50";

const secondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium disabled:opacity-40 dark:border-[#30415D]";

const categoryLabels: Record<string, string> = {
  materials: "Materials",
  support: "Get Support",
  feedback: "Feedback",
  issue: "Report Issue",
};

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

async function adminApi<T>(
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
    `${API}/api/admin/community${path}`,
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
      data.error || "Unable to process request."
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

function Status({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status] || ""}`}>
      {statusLabels[status] || status}
    </span>
  );
}

export default function AdminCommunityPage() {

  const [summary, setSummary] = useState<Summary>({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  });

  const [unreadSummary, setUnreadSummary] =
    useState<UnreadSummary>({
      new_requests: 0,
      unread_messages: 0,
      unread_tickets: 0,
    });

  const [ticketUnread, setTicketUnread] =
    useState<Record<string, TicketUnread>>({});

  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [selected, setSelected] =
    useState<Detail | null>(null);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [messagePage, setMessagePage] = useState(1);
  const [messageTotal, setMessageTotal] = useState(0);

  const [materials, setMaterials] =
    useState<Material[]>([]);

  const [materialPage, setMaterialPage] = useState(1);
  const [materialTotal, setMaterialTotal] = useState(0);

  const [materialId, setMaterialId] = useState("");

  const [reply, setReply] = useState("");
  const [resolution, setResolution] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadUnread = useCallback(async (
    items: Ticket[]
  ) => {

    const ids = items.map((item) => item.id);

    const [stats, details] = await Promise.all([
      adminApi<UnreadSummary>("/unread-summary"),

      ids.length > 0
        ? adminApi<{ tickets: TicketUnread[] }>(
            `/unread-tickets?ids=${encodeURIComponent(
              ids.join(",")
            )}`
          )
        : Promise.resolve({
            tickets: [] as TicketUnread[],
          }),
    ]);

    setUnreadSummary(stats);

    setTicketUnread(
      Object.fromEntries(
        details.tickets.map((item) => [
          item.request_id,
          item,
        ])
      )
    );

  }, []);

  const loadList = useCallback(async () => {

    setLoading(true);
    setError("");

    try {

      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });

      if (category !== "all") {
        params.set("category", category);
      }

      if (status !== "all") {
        params.set("status", status);
      }

      const [stats, result] = await Promise.all([
        adminApi<Summary>("/summary"),
        adminApi<{
          requests: Ticket[];
          total: number;
        }>(`/requests?${params}`),
      ]);

      setSummary(stats);
      setTickets(result.requests || []);
      setTotal(result.total || 0);

      await loadUnread(result.requests || []);

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load requests."
      );

    } finally {

      setLoading(false);

    }

  }, [category, status, page, loadUnread]);

  useEffect(() => {

    const timer = window.setTimeout(() => {
      void loadList();
    }, 0);

    return () => window.clearTimeout(timer);

  }, [loadList]);

  async function fetchMessages(
    id: string,
    targetPage = 1
  ) {

    const data = await adminApi<{
      messages: Message[];
      total: number;
    }>(
      `/requests/${id}/messages?page=${targetPage}&limit=50`
    );

    setMessages(data.messages || []);
    setMessageTotal(data.total || 0);
    setMessagePage(targetPage);

    if (targetPage === 1) {

      const displayedMessages = data.messages || [];

      const lastMessage =
        displayedMessages[displayedMessages.length - 1];

      await adminApi(`/requests/${id}/read`, {
        method: "PATCH",
        body: JSON.stringify({
          message_id: lastMessage?.id || null,
        }),
      });

      await loadUnread(tickets);

    }

  }

  async function fetchMaterials(
    id: string,
    targetPage = 1
  ) {

    const data = await adminApi<{
      materials: Material[];
      total: number;
    }>(
      `/requests/${id}/materials?page=${targetPage}&limit=50`
    );

    setMaterials(data.materials || []);
    setMaterialTotal(data.total || 0);
    setMaterialPage(targetPage);

  }

  async function loadDetail(id: string) {

    const detail = await adminApi<Detail>(
      `/requests/${id}`
    );

    setSelected(detail);

    await fetchMessages(id);

    if (
      detail.request.category === "materials" &&
      ["pending", "in_progress"].includes(
        detail.request.status
      )
    ) {

      await fetchMaterials(id);

    } else {

      setMaterials([]);
      setMaterialTotal(0);

    }

  }

  async function openTicket(id: string) {

    if (busy) return;

    setBusy(true);
    setError("");
    setSuccess("");

    setSelected(null);
    setMessages([]);
    setMaterials([]);
    setMaterialId("");
    setReply("");
    setResolution("");

    try {

      await loadDetail(id);

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

  async function runAction(
    action: () => Promise<void>
  ) {

    if (busy) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {

      await action();

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete action."
      );

    } finally {

      setBusy(false);

    }

  }

  async function startWorking() {

    if (!selected) return;

    const id = selected.request.id;

    await runAction(async () => {

      await adminApi(`/requests/${id}/start`, {
        method: "POST",
      });

      setSuccess("Request marked In Progress.");

      await loadDetail(id);
      await loadList();

    });

  }

  async function sendReply() {

    if (!selected || !reply.trim()) return;

    const id = selected.request.id;

    await runAction(async () => {

      await adminApi(`/requests/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({
          message: reply.trim(),
        }),
      });

      setReply("");

      setSuccess("Reply sent successfully.");

      await fetchMessages(id);

    });

  }

  async function completeRequest() {

    if (!selected) return;

    const ticket = selected.request;

    if (resolution.trim().length < 3) {

      setError("Enter a final response.");

      return;

    }

    if (
      ticket.category === "materials" &&
      !materialId
    ) {

      setError("Select a matching published PDF.");

      return;

    }

    if (!window.confirm(
      "Complete this request? The conversation will become read-only."
    )) return;

    await runAction(async () => {

      await adminApi(
        `/requests/${ticket.id}/respond`,
        {
          method: "POST",
          body: JSON.stringify({
            response: resolution.trim(),
            complete: true,
            material_id:
              ticket.category === "materials"
                ? materialId
                : null,
          }),
        }
      );

      setResolution("");

      setSuccess("Request completed successfully.");

      await loadDetail(ticket.id);
      await loadList();

    });

  }

  // SMART REFRESH 6B

  const activeTicketId = selected?.request.id;

  useSmartRefresh(async () => {

    await loadUnread(tickets);

  }, {
    enabled: !loading && !busy,
    intervalMs: 30000,
  });

  useEffect(() => {

    if (
      !activeTicketId ||
      messagePage !== 1 ||
      busy ||
      loading
    ) return;

    let active = true;
    let running = false;

    async function refreshConversation() {

      if (
        !active ||
        running ||
        document.visibilityState !== "visible" ||
        !navigator.onLine
      ) return;

      running = true;

      try {

        const data = await adminApi<{
          messages: Message[];
          total: number;
        }>(
          `/requests/${activeTicketId}/messages?page=1&limit=50`
        );

        if (!active) return;

        setMessages(data.messages || []);
        setMessageTotal(data.total || 0);

      } catch {

        // Keep the existing conversation visible
        // during temporary network failures.

      } finally {

        running = false;

      }

    }

    const timer = window.setInterval(() => {
      void refreshConversation();
    }, 15000);

    function resumeRefresh() {
      if (document.visibilityState === "visible") {
        void refreshConversation();
      }
    }

    document.addEventListener(
      "visibilitychange",
      resumeRefresh
    );

    window.addEventListener(
      "online",
      resumeRefresh
    );

    return () => {

      active = false;

      window.clearInterval(timer);

      document.removeEventListener(
        "visibilitychange",
        resumeRefresh
      );

      window.removeEventListener(
        "online",
        resumeRefresh
      );

    };

  }, [
    activeTicketId,
    messagePage,
    busy,
    loading,
  ]);

  const ticket = selected?.request;

  const canReply = Boolean(
    ticket &&
    ["pending", "in_progress"].includes(ticket.status)
  );

  return (

    <div className="min-h-dvh bg-[#F6F8FC] px-4 py-8 text-slate-900 dark:bg-[#0B1220] dark:text-slate-100 sm:px-8">

      <main className="mx-auto max-w-7xl space-y-6">

        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400"
        >
          <ArrowLeft size={17} />
          Admin Dashboard
        </Link>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-[#172B4C]">

          <div className="flex items-center gap-3">

            <div className="relative rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">

              <Bell size={22} />

              {unreadSummary.unread_tickets > 0 && (

                <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">

                  {unreadSummary.unread_tickets}

                </span>

              )}

            </div>

            <div>

              <p className="font-semibold">
                Community Notifications
              </p>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">

                {unreadSummary.unread_tickets === 0
                  ? "You are all caught up."
                  : `${unreadSummary.unread_tickets} tickets require attention.`}

              </p>

            </div>

          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold">

            <span className="rounded-full bg-white px-3 py-2 text-blue-700 dark:bg-[#0F1D38] dark:text-blue-300">

              {unreadSummary.new_requests} new requests

            </span>

            <span className="rounded-full bg-white px-3 py-2 text-blue-700 dark:bg-[#0F1D38] dark:text-blue-300">

              {unreadSummary.unread_messages} unread replies

            </span>

          </div>

        </section>

        <header className="flex flex-wrap items-center justify-between gap-4">

          <div>

            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Admin Portal
            </p>

            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              Community Management
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Manage student requests, support and conversations.
            </p>

          </div>

          <button
            type="button"
            disabled={busy || loading}
            onClick={() => void runAction(async () => {

              await loadList();

              if (ticket) {
                await loadDetail(ticket.id);
              }

            })}
            className={secondary}
          >
            <RefreshCw size={17} />
            Refresh
          </button>

        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">

          {[
            {
              label: "Total Requests",
              value: summary.total,
              Icon: ClipboardList,
            },
            {
              label: "Pending",
              value: summary.pending,
              Icon: Clock,
            },
            {
              label: "In Progress",
              value: summary.in_progress,
              Icon: MessageSquare,
            },
            {
              label: "Completed",
              value: summary.completed,
              Icon: CheckCircle2,
            },
          ].map(({ label, value, Icon }) => (

            <article key={label} className={card}>

              <Icon
                size={23}
                className="text-blue-600 dark:text-blue-400"
              />

              <p className="mt-3 text-2xl font-bold">
                {value}
              </p>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {label}
              </p>

            </article>

          ))}

        </section>

        {error && (

          <p
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>

        )}

        {success && (

          <p
            role="status"
            className="rounded-xl bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950 dark:text-green-300"
          >
            {success}
          </p>

        )}

        <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">

          <section className={`${card} space-y-4`}>

            <h2 className="text-lg font-bold">
              Student Requests
            </h2>

            <label className="block text-sm font-medium">
              Category

              <select
                value={category}
                disabled={busy}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
                className={`${field} mt-2`}
              >
                <option value="all">All categories</option>
                <option value="materials">Materials</option>
                <option value="support">Get Support</option>
                <option value="feedback">Feedback</option>
                <option value="issue">Report Issue</option>
              </select>

            </label>

            <label className="block text-sm font-medium">
              Status

              <select
                value={status}
                disabled={busy}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className={`${field} mt-2`}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

            </label>

            {loading ? (

              <p className="py-5 text-center text-sm text-slate-500">
                Loading requests...
              </p>

            ) : tickets.length === 0 ? (

              <p className="py-5 text-center text-sm text-slate-500">
                No requests found.
              </p>

            ) : tickets.map((item) => (

              <button
                key={item.id}
                type="button"
                disabled={busy}
                onClick={() => void openTicket(item.id)}
                className={`w-full space-y-2 rounded-xl border p-4 text-left ${
                  ticket?.id === item.id
                    ? "border-blue-500 bg-blue-50 dark:bg-[#172B4C]"
                    : "border-slate-200 dark:border-[#30415D]"
                }`}
              >

                <div className="flex flex-wrap items-center justify-between gap-2">

                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    {item.ticket_number}
                  </span>

                  <Status status={item.status} />

                </div>

                <p className="font-semibold">
                  {item.title}
                </p>

                {(
                  ticketUnread[item.id]?.is_new ||
                  (ticketUnread[item.id]?.unread_messages || 0) > 0
                ) && (

                  <div className="flex flex-wrap gap-2">

                    {ticketUnread[item.id]?.is_new && (

                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">

                        New Request

                      </span>

                    )}

                    {(ticketUnread[item.id]?.unread_messages || 0) > 0 && (

                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">

                        {ticketUnread[item.id].unread_messages} unread

                      </span>

                    )}

                  </div>

                )}

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {categoryLabels[item.category]}
                  {" · "}
                  {dateLabel(item.created_at)}
                </p>

              </button>

            ))}

            <div className="flex items-center justify-between gap-2">

              <button
                type="button"
                disabled={page === 1 || loading || busy}
                onClick={() => setPage((p) => p - 1)}
                className={secondary}
              >
                Previous
              </button>

              <span className="text-xs text-slate-500">
                Page {page}
              </span>

              <button
                type="button"
                disabled={page * 20 >= total || loading || busy}
                onClick={() => setPage((p) => p + 1)}
                className={secondary}
              >
                Next
              </button>

            </div>

          </section>

          {!ticket ? (

            <section className={`${card} py-16 text-center`}>

              <MessageSquare
                size={42}
                className="mx-auto text-slate-400"
              />

              <h2 className="mt-4 font-semibold">
                Select a student request
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                View details, reply and resolve requests.
              </p>

            </section>

          ) : (

            <div className="min-w-0 space-y-5">

              <section className={`${card} space-y-4`}>

                <div className="flex flex-wrap items-center justify-between gap-3">

                  <h2 className="text-xl font-bold">
                    {ticket.title}
                  </h2>

                  <Status status={ticket.status} />

                </div>

                <p className="text-xs text-slate-500">
                  {ticket.ticket_number}
                  {" · "}
                  {categoryLabels[ticket.category]}
                  {" · "}
                  {dateLabel(ticket.created_at)}
                </p>

                <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-[#0F1D38]">

                  <p className="font-semibold">
                    Student Details
                  </p>

                  <p className="mt-2">
                    Name: {selected?.student?.full_name ||
                      selected?.student?.name ||
                      "Unavailable"}
                  </p>

                  <p className="mt-1 break-all">
                    Email: {selected?.student?.email || "Unavailable"}
                  </p>

                  <p className="mt-1">
                    Institution ID: {selected?.student?.institution_id ?? "Unavailable"}
                  </p>

                </div>

                <p className="whitespace-pre-wrap break-words text-sm leading-7">
                  {ticket.description}
                </p>

                {ticket.category === "materials" && (

                  <div className="rounded-xl border border-blue-200 p-4 text-sm dark:border-blue-900">

                    <p className="font-semibold">
                      Requested Material
                    </p>

                    <p className="mt-2">
                      {ticket.branch} · Semester {ticket.semester}
                    </p>

                    <p className="mt-1">
                      {ticket.subject_name}
                      {" · "}
                      {ticket.material_type}
                    </p>

                  </div>

                )}

                {ticket.status === "pending" && (

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void startWorking()}
                    className={primary}
                  >
                    <Clock size={17} />
                    Start Working
                  </button>

                )}

                {ticket.admin_response &&
                  !busy &&
                  messagePage === 1 &&
                  !messages.some(
                    (item) =>
                      item.sender_role === "admin" &&
                      item.message === ticket.admin_response
                  ) && (

                  <div className="rounded-xl bg-blue-50 p-4 dark:bg-[#172B4C]">

                    <p className="font-semibold">
                      Previous Admin Response
                    </p>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                      {ticket.admin_response}
                    </p>

                  </div>

                )}

              </section>

              <section className={`${card} space-y-4`}>

                <div className="flex items-center justify-between gap-3">

                  <h3 className="font-bold">
                    Student Conversation
                  </h3>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runAction(
                      () => fetchMessages(ticket.id)
                    )}
                    className={secondary}
                  >
                    <RefreshCw size={15} />
                    Refresh
                  </button>

                </div>

                {messageTotal > 50 && (

                  <div className="flex justify-between gap-2">

                    <button
                      type="button"
                      disabled={busy || messagePage * 50 >= messageTotal}
                      onClick={() => void runAction(
                        () => fetchMessages(
                          ticket.id,
                          messagePage + 1
                        )
                      )}
                      className={secondary}
                    >
                      Older
                    </button>

                    <button
                      type="button"
                      disabled={busy || messagePage === 1}
                      onClick={() => void runAction(
                        () => fetchMessages(
                          ticket.id,
                          messagePage - 1
                        )
                      )}
                      className={secondary}
                    >
                      Newer
                    </button>

                  </div>

                )}

                <div className="max-h-[450px] min-h-32 space-y-4 overflow-y-auto rounded-xl bg-slate-50 p-4 dark:bg-[#0B1220]">

                  {messages.length === 0 && (

                    <p className="py-8 text-center text-sm text-slate-500">
                      No replies yet.
                    </p>

                  )}

                  {/* UNIFIED RESOLUTION 6C */}

                  {messages.map((item) => (

                    item.message_type === "resolution" ? (

                      <div
                        key={item.id}
                        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40"
                      >

                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">

                          <CheckCircle2 size={18} />

                          <p className="text-sm font-bold">
                            Final Resolution
                          </p>

                        </div>

                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-900 dark:text-slate-100">
                          {item.message}
                        </p>

                        <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-300">

                          PolyMate Support · {dateLabel(item.created_at)}

                        </p>

                      </div>

                    ) : (

                    <div
                      key={item.id}
                      className={`flex ${
                        item.sender_role === "admin"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >

                      <div className={`max-w-[85%] rounded-2xl p-4 ${
                        item.sender_role === "admin"
                          ? "bg-blue-700 text-white"
                          : "bg-white dark:bg-[#24334D]"
                      }`}>

                        <p className="mb-2 text-xs font-semibold opacity-75">
                          {item.sender_role === "admin"
                            ? "PolyMate Support"
                            : "Student"}
                        </p>

                        <p className="whitespace-pre-wrap break-words text-sm leading-6">
                          {item.message}
                        </p>

                        <p className="mt-2 text-right text-[10px] opacity-70">
                          {dateLabel(item.created_at)}
                        </p>

                      </div>

                    </div>

                  )))}

                </div>

                {canReply ? (

                  <form
                    className="space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void sendReply();
                    }}
                  >

                    <textarea
                      aria-label="Reply to student"
                      value={reply}
                      onChange={(event) =>
                        setReply(event.target.value)
                      }
                      maxLength={2000}
                      rows={3}
                      placeholder="Write a reply to the student..."
                      className={field}
                    />

                    <button
                      type="submit"
                      disabled={busy || !reply.trim()}
                      className={primary}
                    >
                      <Send size={17} />
                      Send Reply
                    </button>

                  </form>

                ) : (

                  <p className="text-sm text-slate-500">
                    This conversation is closed.
                  </p>

                )}

              </section>

              {canReply && (

                <section className={`${card} space-y-4`}>

                  <h3 className="font-bold">
                    Resolve Request
                  </h3>

                  {ticket.category === "materials" && (

                    <div className="space-y-3">

                      <label className="block text-sm font-medium">

                        Matching Published PDF

                        <select
                          value={materialId}
                          onChange={(event) =>
                            setMaterialId(event.target.value)
                          }
                          className={`${field} mt-2`}
                        >

                          <option value="">
                            Select a material
                          </option>

                          {materials.map((material) => (

                            <option
                              key={material.id}
                              value={material.id}
                            >
                              {material.title}
                            </option>

                          ))}

                        </select>

                      </label>

                      {materialTotal > 50 && (

                        <div className="flex gap-2">

                          <button
                            type="button"
                            disabled={busy || materialPage === 1}
                            onClick={() => void runAction(
                              () => fetchMaterials(
                                ticket.id,
                                materialPage - 1
                              )
                            )}
                            className={secondary}
                          >
                            Previous PDFs
                          </button>

                          <button
                            type="button"
                            disabled={busy || materialPage * 50 >= materialTotal}
                            onClick={() => void runAction(
                              () => fetchMaterials(
                                ticket.id,
                                materialPage + 1
                              )
                            )}
                            className={secondary}
                          >
                            More PDFs
                          </button>

                        </div>

                      )}

                      {materials.length === 0 && (

                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          No matching published PDF found.
                          Ask faculty to upload the requested material.
                        </p>

                      )}

                      <Link
                        href="/admin/materials"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400"
                      >
                        <FileText size={16} />
                        Manage Materials
                      </Link>

                    </div>

                  )}

                  <label className="block text-sm font-medium">

                    Final Response

                    <textarea
                      value={resolution}
                      onChange={(event) =>
                        setResolution(event.target.value)
                      }
                      rows={4}
                      maxLength={2000}
                      placeholder="Explain how the request was resolved..."
                      className={`${field} mt-2`}
                    />

                  </label>

                  <button
                    type="button"
                    disabled={
                      busy ||
                      resolution.trim().length < 3 ||
                      (
                        ticket.category === "materials" &&
                        !materialId
                      )
                    }
                    onClick={() => void completeRequest()}
                    className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-40"
                  >
                    <CheckCircle2 size={17} />
                    Resolve & Complete
                  </button>

                </section>

              )}

              <section className={`${card} space-y-3`}>

                <h3 className="font-bold">
                  Request History
                </h3>

                {selected?.events.map((event) => (

                  <div
                    key={event.id}
                    className="border-l-2 border-blue-500 pl-4"
                  >

                    <p className="text-sm">
                      {event.message}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {dateLabel(event.created_at)}
                    </p>

                  </div>

                ))}

              </section>

            </div>

          )}

        </div>

        <footer className="text-center text-xs text-slate-400">
          PolyMate Admin Portal
        </footer>

      </main>

    </div>

  );

}
