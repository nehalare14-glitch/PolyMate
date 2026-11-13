"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
  MessageSquare,
  Send,
  RefreshCw,
  LockKeyhole,
} from "lucide-react";

type Message = {
  id: string;
  request_id: string;
  sender_role: "student" | "admin";
  message: string;
  created_at: string;
};

type ConversationData = {
  messages: Message[];
  total: number;
  page: number;
  limit: number;
  status: string;
  can_reply: boolean;
};

type ApiClient = <T>(
  path: string,
  options?: RequestInit
) => Promise<T>;

type Props = {
  requestId: string;
  api: ApiClient;
};

export default function CommunityConversation({
  requestId,
  api,
}: Props) {

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [reply, setReply] = useState("");

  const [canReply, setCanReply] = useState(false);

  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);

  const [refresh, setRefresh] = useState(0);

  const path =
    `/requests/${requestId}/messages`;

  useEffect(() => {

    let active = true;

    async function load() {

      try {

        const data = await api<ConversationData>(
          `${path}?page=${page}&limit=50`
        );

        if (!active) return;

        setMessages(data.messages || []);
        setTotal(data.total || 0);
        setCanReply(data.can_reply);
        setError("");

      } catch (err) {

        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load conversation."
        );

      } finally {

        if (active) {
          setLoading(false);
        }

      }

    }

    void load();

    return () => {
      active = false;
    };

  }, [api, path, page, refresh]);

  function reload() {

    setLoading(true);
    setPage(1);
    setRefresh((value) => value + 1);

  }

  async function sendReply(event: FormEvent) {

    event.preventDefault();

    const message = reply.trim();

    if (
      !message ||
      message.length > 2000 ||
      busy ||
      !canReply
    ) return;

    setBusy(true);
    setError("");

    try {

      await api(path, {
        method: "POST",
        body: JSON.stringify({ message }),
      });

      setReply("");

      reload();

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to send reply."
      );

    } finally {

      setBusy(false);

    }

  }

  return (

    <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-[#30415D] dark:bg-[#0B1220] sm:p-5">

      <header className="flex flex-wrap items-center justify-between gap-3">

        <div className="flex items-center gap-3">

          <span className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-[#172B4C] dark:text-blue-400">

            <MessageSquare size={21} />

          </span>

          <div>

            <h3 className="font-semibold">
              Support Conversation
            </h3>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Private conversation with PolyMate
            </p>

          </div>

        </div>

        <button
          type="button"
          disabled={loading || busy}
          onClick={reload}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium disabled:opacity-50 dark:border-[#30415D]"
        >

          <RefreshCw size={15} />

          Refresh

        </button>

      </header>

      {error && (

        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>

      )}

      {total > 50 && (

        <div className="flex items-center justify-between gap-2">

          <button
            type="button"
            disabled={loading || busy || page * 50 >= total}
            onClick={() => {
              setLoading(true);
              setPage((value) => value + 1);
            }}
            className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40"
          >
            Older messages
          </button>

          <span className="text-xs text-slate-500">
            Page {page}
          </span>

          <button
            type="button"
            disabled={loading || busy || page === 1}
            onClick={() => {
              setLoading(true);
              setPage((value) => value - 1);
            }}
            className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40"
          >
            Newer messages
          </button>

        </div>

      )}

      <div className="max-h-[450px] min-h-32 space-y-4 overflow-y-auto rounded-xl bg-white p-3 dark:bg-[#0F1D38] sm:p-4">

        {loading ? (

          <p className="py-6 text-center text-sm text-slate-500">
            Loading conversation...
          </p>

        ) : messages.length === 0 ? (

          <div className="py-8 text-center">

            <MessageSquare
              size={32}
              className="mx-auto text-slate-400"
            />

            <p className="mt-3 text-sm font-medium">
              No replies yet
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Send a message to the PolyMate team.
            </p>

          </div>

        ) : messages.map((item) => {

          const isStudent =
            item.sender_role === "student";

          return (

            <div
              key={item.id}
              className={`flex ${
                isStudent
                  ? "justify-end"
                  : "justify-start"
              }`}
            >

              <div className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${
                isStudent
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-900 dark:bg-[#24334D] dark:text-white"
              }`}>

                <p className={`mb-1 text-xs font-semibold ${
                  isStudent
                    ? "text-blue-200"
                    : "text-blue-700 dark:text-blue-300"
                }`}>

                  {isStudent
                    ? "You"
                    : "PolyMate Support"}

                </p>

                <p className="whitespace-pre-wrap break-words text-sm leading-6">

                  {item.message}

                </p>

                <p className={`mt-2 text-right text-[10px] ${
                  isStudent
                    ? "text-blue-200"
                    : "text-slate-500 dark:text-slate-400"
                }`}>

                  {new Date(
                    item.created_at
                  ).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}

                </p>

              </div>

            </div>

          );

        })}

      </div>

      {!loading && canReply && (

        <form
          onSubmit={sendReply}
          className="space-y-2"
        >

          <textarea
            aria-label="Your reply"
            value={reply}
            onChange={(event) =>
              setReply(event.target.value)
            }
            maxLength={2000}
            rows={3}
            placeholder="Type your reply..."
            className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-[#30415D] dark:bg-[#17243B] dark:text-white"
          />

          <div className="flex items-center justify-between gap-3">

            <span className="text-xs text-slate-500">

              {reply.length}/2000

            </span>

            <button
              type="submit"
              disabled={
                busy ||
                loading ||
                !reply.trim()
              }
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >

              <Send size={16} />

              {busy ? "Sending..." : "Send Reply"}

            </button>

          </div>

        </form>

      )}

      {!loading && !canReply && !error && (

        <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-3 text-sm text-slate-600 dark:bg-[#17243B] dark:text-slate-300">

          <LockKeyhole size={16} />

          This request is closed. You can still read
          the conversation history.

        </div>

      )}

    </section>

  );

}
