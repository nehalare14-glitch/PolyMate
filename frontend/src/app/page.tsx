import Link from "next/link";
import { InstallAppButton } from "@/components/pwa/PWAProvider";
import { BookOpen, GraduationCap, FileText } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-[#0B1220] dark:text-slate-100">

      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">

        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">

          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-blue-700 dark:text-blue-400"
          >
            <BookOpen size={27} />
            PolyMate
          </Link>

          <div className="flex items-center gap-3">

            <Link
              href="/login"
              prefetch={false}
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Login
            </Link>

            <Link
              href="/register"
              prefetch={false}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Get Started
            </Link>

          </div>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-24 text-center">

        <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          Diploma Learning Platform
        </span>

        <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-5xl dark:text-white">
          Your Academic Resources,

          <span className="block text-blue-600 dark:text-blue-400">
            All in One Place.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Access diploma study materials, notes, question papers,
          syllabuses and lab manuals through PolyMate.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-4">

          <Link
            href="/register"
            prefetch={false}
            className="rounded-xl bg-blue-600 px-7 py-3 font-medium text-white hover:bg-blue-700"
          >
            Create Account
          </Link>

          <Link
            href="/login"
            prefetch={false}
            className="rounded-xl border border-slate-300 bg-white px-7 py-3 font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            Sign In
          </Link>

        </div>

        <InstallAppButton className="mt-5" />

        <div className="mt-20 grid gap-5 text-left sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">

            <GraduationCap
              className="text-blue-600 dark:text-blue-400"
              size={30}
            />

            <h2 className="mt-4 text-lg font-semibold dark:text-white">
              For Students
            </h2>

            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Find and view study materials for your branch and semester.
            </p>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">

            <FileText
              className="text-blue-600 dark:text-blue-400"
              size={30}
            />

            <h2 className="mt-4 text-lg font-semibold dark:text-white">
              For Faculty
            </h2>

            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Upload PDF materials and share academic resources with students.
            </p>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">

            <BookOpen
              className="text-blue-600 dark:text-blue-400"
              size={30}
            />

            <h2 className="mt-4 text-lg font-semibold dark:text-white">
              Study Resources
            </h2>

            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Access notes, question papers, syllabuses and lab manuals.
            </p>

          </div>

        </div>

      </section>

      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">

        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row">

          <p className="text-sm text-slate-500 dark:text-slate-400">
            &copy; 2026 PolyMate. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-5 text-sm">

            <Link
              href="/privacy"
              className="font-medium text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
            >
              Privacy Policy
            </Link>

            <Link
              href="/terms"
              className="font-medium text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
            >
              Terms of Service
            </Link>

            <a
              href="mailto:polymate.official@gmail.com"
              className="font-medium text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
            >
              Contact Us
            </a>

          </div>
        </div>
      </footer>

    </main>
  );
}
