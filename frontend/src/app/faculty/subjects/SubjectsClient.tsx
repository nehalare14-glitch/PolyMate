"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Search,
} from "lucide-react";

type Subject = {
  id: string;
  name: string;
  code: string;
  branch: string;
  semester: number;
};

const subjects: Subject[] = [];

export default function SubjectsClient() {
  const [search, setSearch] = useState("");

  // Subject assignments will come from the protected Flask API.


  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return subjects.filter((subject) =>
      [
        subject.name,
        subject.code,
        subject.branch,
        String(subject.semester),
      ].some((value) => value.toLowerCase().includes(query))
    );
  }, [search]);

  return (
    <main className="min-h-screen bg-[#F6F8FC] px-4 py-8 text-slate-900 dark:bg-[#0B1220] dark:text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/faculty/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>

        <h1 className="mt-6 text-3xl font-bold">
          My Subjects
        </h1>

        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          View the academic subjects assigned to you.
        </p>

        <div className="relative mt-8">
          <Search
            size={19}
            className="absolute left-4 top-3.5 text-slate-400"
          />

          <input
            type="search"
            placeholder="Search subjects..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="mt-7 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
            <BookOpen
              size={42}
              className="mx-auto text-blue-600 dark:text-blue-400"
            />

            <h2 className="mt-5 text-lg font-semibold">
              {search.trim()
                ? "No matching subjects"
                : "No subjects assigned yet"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              {search.trim()
                ? "Try searching with another subject name or code."
                : "Your assigned subjects will appear here once an administrator assigns them."}
            </p>
          </div>
        ) : (
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {filtered.map((subject) => (
              <article
                key={subject.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
              >
                <BookOpen size={23} className="text-blue-600" />

                <h2 className="mt-4 font-semibold">
                  {subject.name}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {subject.code}
                </p>

                <p className="mt-3 text-sm">
                  {subject.branch} · Semester {subject.semester}
                </p>

                <Link
                  href={`/faculty/materials?subject=${encodeURIComponent(subject.id)}`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  View Materials
                  <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
