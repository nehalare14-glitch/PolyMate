"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Send, CheckCircle2, KeyRound } from "lucide-react";
import { resetPassword } from "@/lib/auth-service";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      await resetPassword(email.trim());
      setSubmitted(true);
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code: unknown }).code)
          : "";

      if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Unable to process the request right now. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f5f7fb] px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400"
        >
          <ArrowLeft size={18} />
          Back to Login
        </Link>

        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9 dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            {submitted ? <CheckCircle2 size={27} /> : <KeyRound size={27} />}
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {submitted ? "Check your email" : "Forgot password?"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {submitted
              ? "If an account is associated with this email, you will receive a password reset link. Check your inbox and spam folder."
              : "Enter your registered email address to request a secure password reset link."}
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="reset-email"
                  className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={19}
                    className="absolute left-4 top-3.5 text-slate-400"
                  />

                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email address"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:ring-blue-900"
                  />
                </div>
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={18} />
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          ) : (
            <div className="mt-8">
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setError("");
                }}
                className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Try another email
              </button>
            </div>
          )}

          <p className="mt-7 text-center text-sm text-slate-600 dark:text-slate-300">
            Remember your password?{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-700 hover:underline dark:text-blue-400"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          PolyMate · Secure account recovery
        </p>
      </div>
    </main>
  );
}
