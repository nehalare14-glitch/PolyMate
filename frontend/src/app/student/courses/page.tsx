"use client";

import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Laptop,
  Cpu,
  Zap,
  Settings,
  Building2,
  BrainCircuit,
  BriefcaseBusiness,
  GraduationCap,
  Layers3,
  BookOpen,
  ChevronRight,
} from "lucide-react";

import StudentSidebar from "@/components/student/StudentSidebar";
import CourseSubjects from "./CourseSubjects";

const branches = [
  {
    code: "CSE",
    name: "Computer Science Engineering",
    Icon: Laptop,
  },
  {
    code: "ECE",
    name: "Electronics & Communication Engineering",
    Icon: Cpu,
  },
  {
    code: "EEE",
    name: "Electrical & Electronics Engineering",
    Icon: Zap,
  },
  {
    code: "MEC",
    name: "Mechanical Engineering",
    Icon: Settings,
  },
  {
    code: "CIVIL",
    name: "Civil Engineering",
    Icon: Building2,
  },
  {
    code: "AIML",
    name: "Artificial Intelligence & Machine Learning",
    Icon: BrainCircuit,
  },
  {
    code: "CCP",
    name: "Commercial & Computer Practice",
    Icon: BriefcaseBusiness,
  },
];

type Branch = (typeof branches)[number];

export default function StudentCoursesPage() {
  const [selectedBranch, setSelectedBranch] =
    useState<Branch | null>(null);

  const [semester, setSemester] =
    useState<number | null>(null);

  const [scheme, setScheme] = useState("C24");

  function resetCourse() {
    setSelectedBranch(null);
    setSemester(null);
  }

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-slate-900 dark:bg-[#0B1220] dark:text-[#F1F5F9]">

      <StudentSidebar />

      <main className="min-h-screen px-4 pb-12 pt-24 sm:px-6 md:ml-64 md:px-8 md:pt-10 xl:px-10">

        <div className="mx-auto max-w-7xl space-y-7">

          {/* Page Header */}

          <header>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Student Portal
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Courses
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Explore diploma branches and access your academic resources.
            </p>
          </header>

          {!selectedBranch ? (

            <>

              {/* Course Banner */}

              <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#102A78] via-[#1746B8] to-[#2563EB] p-6 text-white shadow-sm sm:p-9">

                <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/15" />

                <div className="relative flex items-center justify-between gap-6">

                  <div className="min-w-0 flex-1">

                    <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-blue-200">
                      <GraduationCap size={17} />
                      Telangana Polytechnic Education
                    </p>

                    <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
                      Explore Your Courses
                    </h2>

                    <p className="mt-3 max-w-xl text-sm leading-7 text-blue-100">
                      Choose a branch to explore subjects,
                      study notes, question papers and syllabus.
                    </p>

                  </div>

                  <div className="hidden shrink-0 rounded-3xl border border-white/20 bg-white/10 p-6 sm:block">
                    <Layers3
                      size={70}
                      strokeWidth={1.4}
                      className="text-blue-100"
                    />
                  </div>

                </div>

              </section>

              {/* Branch Cards */}

              <section>

                <div className="flex items-center justify-between gap-3">

                  <h2 className="text-lg font-bold">
                    Available Branches
                  </h2>

                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {branches.length} Branches
                  </span>

                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

                  {branches.map(({ code, name, Icon }) => (

                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setSelectedBranch({
                          code,
                          name,
                          Icon,
                        });
                        setSemester(null);
                      }}
                      className="group flex min-h-52 flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-blue-400 dark:border-[#30415D] dark:bg-[#0F1D38] dark:hover:border-blue-500"
                    >

                      <span className="self-start rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-[#172B4C] dark:text-blue-400">
                        <Icon size={27} strokeWidth={1.8} />
                      </span>

                      <h3 className="mt-4 text-lg font-bold">
                        {code}
                      </h3>

                      <p className="mt-1 flex-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {name}
                      </p>

                      <div className="mt-5 flex w-full items-center justify-between border-t border-slate-100 pt-4 dark:border-[#30415D]">

                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          Explore Course
                        </span>

                        <ArrowRight
                          size={18}
                          className="text-blue-600 dark:text-blue-400"
                        />

                      </div>

                    </button>

                  ))}

                </div>

              </section>

            </>

          ) : (

            <>

              {/* Branch Navigation */}

              <div className="flex flex-wrap items-center gap-2 text-sm">

                <button
                  type="button"
                  onClick={resetCourse}
                  className="inline-flex items-center gap-2 font-semibold text-blue-600 dark:text-blue-400"
                >
                  <ArrowLeft size={17} />
                  All Courses
                </button>

                <ChevronRight
                  size={16}
                  className="text-slate-400"
                />

                <span className="font-medium">
                  {selectedBranch.code}
                </span>

              </div>

              {/* Selected Branch */}

              <section className="rounded-3xl bg-gradient-to-br from-[#102A78] to-[#2563EB] p-6 text-white sm:p-8">

                <div className="flex items-center gap-4">

                  <span className="rounded-2xl bg-white/10 p-4">

                    <selectedBranch.Icon
                      size={32}
                    />

                  </span>

                  <div>

                    <p className="text-sm text-blue-200">
                      {selectedBranch.code}
                    </p>

                    <h2 className="mt-1 text-xl font-bold sm:text-2xl">
                      {selectedBranch.name}
                    </h2>

                  </div>

                </div>

              </section>

                            {/* Curriculum Selection */}

              <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-[#30415D] dark:bg-[#0F1D38]">

                <label
                  htmlFor="curriculum"
                  className="text-sm font-semibold"
                >
                  Select Curriculum
                </label>

                <select
                  id="curriculum"
                  value={scheme}
                  onChange={(event) => {
                    setScheme(event.target.value);
                    setSemester(null);
                  }}
                  className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 dark:border-[#30415D] dark:bg-[#17243B] dark:text-white sm:max-w-xs"
                >
                  <option value="C24">
                    C24 Curriculum
                  </option>
                </select>

              </section>

              {/* Semester Selection */}

              <section>

                <h2 className="text-lg font-bold">
                  Select Semester
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Choose your semester to continue.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3">

                  {[1, 2, 3, 4, 5, 6].map((number) => (

                    <button
                      key={number}
                      type="button"
                      onClick={() => setSemester(number)}
                      aria-pressed={semester === number}
                      className={`rounded-2xl border p-5 text-left transition-colors ${
                        semester === number
                          ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          : "border-slate-200 bg-white hover:border-blue-400 dark:border-[#30415D] dark:bg-[#0F1D38]"
                      }`}
                    >

                      <BookOpen
                        size={24}
                        className="mb-3 text-blue-600 dark:text-blue-400"
                      />

                      <p className="font-semibold">
                        Semester {number}
                      </p>

                      

                    </button>

                  ))}

                </div>

              </section>

              {semester !== null && (
                <CourseSubjects
                  key={`${selectedBranch.code}-${scheme}-${semester}`}
                  branch={selectedBranch.code}
                  scheme={scheme}
                  semester={semester}
                />
              )}

            </>

          )}

          <footer className="text-center text-xs text-slate-400">
            PolyMate Student Portal
          </footer>

        </div>

      </main>

    </div>
  );
}


