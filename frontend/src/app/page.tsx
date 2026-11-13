import Link from "next/link";
import { BookOpen, GraduationCap, FileText } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-blue-700">
            <BookOpen size={27} />
            PolyMate
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-700">
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
          Diploma Learning Platform
        </span>

        <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-5xl">
          Your Academic Resources,
          <span className="block text-blue-600">All in One Place.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Access diploma study materials, notes, question papers,
          syllabuses and lab manuals through PolyMate.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Link
            href="/register"
            className="rounded-xl bg-blue-600 px-7 py-3 font-medium text-white"
          >
            Create Account
          </Link>

          <Link
            href="/login"
            className="rounded-xl border border-slate-300 bg-white px-7 py-3 font-medium"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-20 grid gap-5 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <GraduationCap className="text-blue-600" size={30} />
            <h2 className="mt-4 text-lg font-semibold">For Students</h2>
            <p className="mt-2 text-sm text-slate-600">
              Find and download study materials for your branch and semester.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <FileText className="text-blue-600" size={30} />
            <h2 className="mt-4 text-lg font-semibold">For Faculty</h2>
            <p className="mt-2 text-sm text-slate-600">
              Upload PDF materials and share academic resources with students.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <BookOpen className="text-blue-600" size={30} />
            <h2 className="mt-4 text-lg font-semibold">Study Resources</h2>
            <p className="mt-2 text-sm text-slate-600">
              Access notes, question papers, syllabuses and lab manuals.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
