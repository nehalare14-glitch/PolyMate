"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Sparkles,
  Send,
  Square,
  Plus,
  Copy,
  Check,
  RefreshCw,
  BookOpen,
  Code2,
  GraduationCap,
  FileText,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import StudentSidebar from "@/components/student/StudentSidebar";
import FacultySidebar from "@/components/faculty/FacultySidebar";
import { auth } from "@/lib/firebase";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:5000";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const studentSuggestions = [
  {
    icon: Code2,
    title: "Programming",
    description: "Explain OOP concepts with Java examples.",
  },
  {
    icon: BookOpen,
    title: "Understand a concept",
    description: "Explain SQL and NoSQL databases.",
  },
  {
    icon: GraduationCap,
    title: "Exam preparation",
    description: "Give me 5 important DBMS exam questions.",
  },
  {
    icon: FileText,
    title: "Study notes",
    description: "Create short notes on computer networks.",
  },
];

const facultySuggestions = [
  {
    icon: FileText,
    title: "Question Paper",
    description: "Create a diploma DBMS practice question paper with marks and sections.",
  },
  {
    icon: BookOpen,
    title: "Teaching Notes",
    description: "Prepare teaching notes on operating system concepts.",
  },
  {
    icon: GraduationCap,
    title: "Lesson Plan",
    description: "Create a 45-minute lesson plan on computer networks.",
  },
  {
    icon: Code2,
    title: "MCQs and Assignments",
    description: "Generate 10 Java programming MCQs with answers.",
  },
];

export default function AIAssistant({
  role,
}: {
  role: "student" | "faculty";
}) {
  const isFaculty = role === "faculty";

  const suggestions = isFaculty
    ? facultySuggestions
    : studentSuggestions;
  const [messages, setMessages] = useState<Message[]>([]);

  const historyRef = useRef<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Checking");
  const [copied, setCopied] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function getToken() {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Please sign in to continue.");
    }

    return user.getIdToken();
  }

  async function checkHealth() {
    setStatus("Checking");

    try {
      const token = await getToken();

      const response = await fetch(
        `${API_URL}/api/ai/health`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        }
      );

      const data = await response.json();

      setStatus(
        response.ok &&
        data.status === "online" &&
        data.model_available
          ? "Online"
          : "Unavailable"
      );
    } catch {
      setStatus("Unavailable");
    }
  }

  useEffect(() => {
    void checkHealth();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      block: "end",
    });
  }, [messages, loading]);

  async function sendQuestion(text: string) {
    const message = text.trim();

    if (!message || busyRef.current) return;

    if (message.length > 2000) {
      setError("Question must not exceed 2000 characters.");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const timeout = window.setTimeout(() => {
      controller.abort(
        new DOMException("AI response timed out.", "TimeoutError")
      );
    }, 200000);

    busyRef.current = true;
    setLoading(true);
    setError("");
    setQuestion("");

    const userId = crypto.randomUUID();
    const answerId = crypto.randomUUID();

    let answer = "";
    let completed = false;

    setMessages((previous) => [
      ...previous,
      {
        id: userId,
        role: "user",
        content: message,
      },
    ]);

    try {
      const token = await getToken();

      const response = await fetch(
        `${API_URL}/api/ai/chat/stream`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            history: historyRef.current.slice(-6),
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
          data.error || "Unable to generate an answer."
        );
      }

      if (!response.body) {
        throw new Error("Streaming is unavailable.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      function processLine(line: string) {
        if (!line.trim()) return;

        const event = JSON.parse(line);

        if (event.type === "error") {
          throw new Error(event.error || "AI generation failed.");
        }

        if (
          event.type === "token" &&
          typeof event.content === "string"
        ) {
          answer += event.content;

          const currentAnswer = answer;

          setMessages((previous) => {
            const exists = previous.some(
              (item) => item.id === answerId
            );

            if (!exists) {
              return [
                ...previous,
                {
                  id: answerId,
                  role: "assistant",
                  content: currentAnswer,
                },
              ];
            }

            return previous.map((item) =>
              item.id === answerId
                ? { ...item, content: currentAnswer }
                : item
            );
          });
        }

        if (event.type === "done") {
          completed = true;

          if (event.done_reason === "length") {
            setError(
              "Response reached its length limit. Ask for a shorter explanation or the next part."
            );
          }
        }
      }

      try {
        while (true) {
          const { value, done } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");

          buffer = lines.pop() ?? "";

          for (const line of lines) {
            processLine(line);
          }
        }

        buffer += decoder.decode();

        if (buffer.trim()) {
          processLine(buffer);
        }
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }

      if (!completed) {
        throw new Error("AI response ended unexpectedly.");
      }

      if (!answer.trim()) {
        throw new Error("AI returned an empty response.");
      }

      // Save only successfully completed exchanges.
      historyRef.current = [
        ...historyRef.current,
        {
          role: "user" as const,
          content: message.slice(0, 1000),
        },
        {
          role: "assistant" as const,
          content: answer.slice(0, 1000),
        },
      ].slice(-6);

      setStatus("Online");

    } catch (err) {

      if (controller.signal.aborted) {
        if (
          controller.signal.reason instanceof DOMException &&
          controller.signal.reason.name === "TimeoutError"
        ) {
          setError("AI response timed out. Please try again.");
        } else {
          setError("Generation stopped.");
        }
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      }

      if (!answer.trim()) {
        setQuestion(message);
      }

    } finally {
      window.clearTimeout(timeout);

      abortRef.current = null;
      busyRef.current = false;
      setLoading(false);
    }
  }

  function stopGenerating() {
    abortRef.current?.abort();
  }

  function newChat() {
    if (loading) return;

    historyRef.current = [];
    setMessages([]);
    setQuestion("");
    setError("");
    setCopied("");
  }

  async function copyAnswer(id: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(id);

      window.setTimeout(() => {
        setCopied("");
      }, 2000);
    } catch {
      setError("Unable to copy the answer.");
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-slate-900 dark:bg-[#0B1220] dark:text-slate-100">

      {isFaculty ? <FacultySidebar /> : <StudentSidebar />}

      <main className={`min-h-screen px-4 pb-8 pt-20 sm:px-6 md:px-8 md:pt-8 ${isFaculty ? "md:ml-72" : "md:ml-64"}`}>

        <div className="mx-auto max-w-5xl">

          {/* Page header */}

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">

            <div className="flex items-center gap-4">

              <div className="rounded-2xl bg-blue-600 p-3 text-white">
                <Bot size={28} />
              </div>

              <div>
                <h1 className="text-2xl font-bold">
                  PolyMate AI
                </h1>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {isFaculty ? "Your personal AI teaching assistant" : "Your personal diploma study assistant"}
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={newChat}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus size={18} />
              New Chat
            </button>

          </div>

          {/* Chat container */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-[#30415D] dark:bg-[#0F1D38]">

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-[#30415D]">

              <div className="flex items-center gap-2">

                <Sparkles size={19} className="text-blue-600 dark:text-blue-400" />

                <span className="font-semibold">
                  {isFaculty ? "AI Teaching Assistant" : "AI Study Assistant"}
                </span>

              </div>

              <div className="flex items-center gap-3">

                <span className="flex items-center gap-2 text-xs font-medium">

                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      status === "Online"
                        ? "bg-green-500"
                        : status === "Checking"
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }`}
                  />

                  {status}

                </span>

                <button
                  type="button"
                  onClick={checkHealth}
                  aria-label="Refresh AI status"
                  className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-[#223553]"
                >
                  <RefreshCw size={16} />
                </button>

              </div>

            </div>

            {/* Chat messages */}

            <div className="min-h-[400px] max-h-[65vh] overflow-y-auto px-4 py-6 sm:px-6">

              {messages.length === 0 ? (

                <div className="mx-auto max-w-2xl py-8">

                  <div className="mb-8 text-center">

                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                      <Sparkles size={32} />
                    </div>

                    <h2 className="text-2xl font-bold">
                      {isFaculty ? "How can I help you teach today?" : "How can I help you study today?"}
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {isFaculty ? "Prepare teaching notes, question papers, lesson plans and assignments." : "Ask questions, understand difficult concepts, prepare for exams and create study notes."}
                    </p>

                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">

                    {suggestions.map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.title}
                          type="button"
                          onClick={() => sendQuestion(item.description)}
                          disabled={loading}
                          className="rounded-xl border border-slate-200 p-4 text-left hover:border-blue-400 hover:bg-blue-50 dark:border-[#30415D] dark:hover:bg-[#223553]"
                        >
                          <Icon
                            size={21}
                            className="mb-3 text-blue-600 dark:text-blue-400"
                          />

                          <p className="font-semibold">
                            {item.title}
                          </p>

                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {item.description}
                          </p>
                        </button>
                      );
                    })}

                  </div>

                </div>

              ) : (

                <div className="space-y-6">

                  {messages.map((message) => (

                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >

                      {message.role === "assistant" && (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                          <Bot size={20} />
                        </div>
                      )}

                      <div
                        className={`min-w-0 max-w-[90%] rounded-2xl px-4 py-3 ${
                          message.role === "user"
                            ? "bg-blue-600 text-white"
                            : "border border-slate-200 bg-slate-50 dark:border-[#30415D] dark:bg-[#172641]"
                        }`}
                      >

                        {message.role === "assistant" ? (

                          <>

                            <p className="mb-3 text-xs font-bold text-blue-600 dark:text-blue-400">
                              PolyMate AI
                            </p>

                            <div className="break-words text-sm leading-7 [&_h1]:my-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:my-2 [&_h3]:font-semibold [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-900 [&_pre]:p-4 [&_pre]:text-slate-100 [&_code]:text-xs [&_table]:block [&_table]:overflow-x-auto [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2">

                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                              >
                                {message.content}
                              </ReactMarkdown>

                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                copyAnswer(
                                  message.id,
                                  message.content
                                )
                              }
                              className="mt-3 flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-[#223553]"
                            >
                              {copied === message.id ? (
                                <Check size={15} />
                              ) : (
                                <Copy size={15} />
                              )}

                              {copied === message.id
                                ? "Copied"
                                : "Copy answer"}
                            </button>

                          </>

                        ) : (

                          <p className="whitespace-pre-wrap text-sm leading-6">
                            {message.content}
                          </p>

                        )}

                      </div>

                    </div>

                  ))}

                  {loading && (
                    <div className="flex items-center gap-3">

                      <div className="rounded-xl bg-blue-600 p-2 text-white">
                        <Bot size={20} />
                      </div>

                      <div
                        role="status"
                        className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-[#172641] dark:text-slate-300"
                      >
                        PolyMate AI is generating...
                      </div>

                    </div>
                  )}

                </div>

              )}

              <div ref={bottomRef} />

            </div>

            {/* Question input */}

            <div className="border-t border-slate-200 p-4 dark:border-[#30415D] sm:p-5">

              {error && (
                <p
                  role="alert"
                  className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
                >
                  {error}
                </p>
              )}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendQuestion(question);
                }}
                className="flex items-end gap-3 rounded-2xl border border-slate-300 bg-slate-50 p-3 focus-within:border-blue-500 dark:border-[#30415D] dark:bg-[#172641]"
              >

                <textarea
                  value={question}
                  onChange={(event) =>
                    setQuestion(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      void sendQuestion(question);
                    }
                  }}
                  placeholder={isFaculty ? "Ask AI to create teaching materials..." : "Ask anything about your diploma subjects..."}
                  rows={2}
                  maxLength={2000}
                  disabled={loading}
                  className="min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
                />

                {loading ? (
                  <button
                    type="button"
                    onClick={stopGenerating}
                    aria-label="Stop generating"
                    title="Stop generating"
                    className="rounded-xl bg-slate-700 p-3 text-white hover:bg-slate-800"
                  >
                    <Square size={20} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!question.trim()}
                    aria-label="Send question"
                    className="rounded-xl bg-blue-600 p-3 text-white hover:bg-blue-700 disabled:opacity-40"
                  >
                    <Send size={20} />
                  </button>
                )}

              </form>

              <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-400">
                <span>
                  AI can make mistakes. Verify important answers.
                </span>

                <span>{question.length}/2000</span>
              </div>

            </div>

          </section>

          <p className="mt-4 text-center text-xs text-slate-400">
            PolyMate AI - Intelligent Multi-Model System
          </p>

        </div>

      </main>

    </div>
  );
}


