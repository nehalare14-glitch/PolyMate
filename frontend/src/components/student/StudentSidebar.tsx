"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Bookmark,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Layers3,
  MessagesSquare,
  Menu,
  UserRound,
  X,
} from "lucide-react";

import SignOutButton from "@/components/auth/SignOutButton";

const navigation = [
  {
    label: "Dashboard",
    href: "/student/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Courses",
    href: "/student/courses",
    icon: Layers3,
  },
  {
    label: "Subject Notes",
    href: "/student/notes",
    icon: BookOpen,
  },
  {
    label: "Question Papers",
    href: "/student/question-papers",
    icon: FileText,
  },
  {
    label: "Bookmarks",
    href: "/student/bookmarks",
    icon: Bookmark,
  },

  {
    label: "Community Hub",
    href: "/student/community",
    icon: MessagesSquare,
  },

  {
    label: "My Profile",
    href: "/student/profile",
    icon: UserRound,
  },
];

export default function StudentSidebar() {
  const pathname = usePathname();


  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const media = window.matchMedia("(min-width: 768px)");

    if (media.matches) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function handleResize(event: MediaQueryListEvent) {
      if (event.matches) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKey);
    media.addEventListener("change", handleResize);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
      media.removeEventListener("change", handleResize);
    };
  }, [open]);


  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-300 bg-white px-4 dark:border-[#30415D] dark:bg-[#0F1D38] md:hidden">
        <Link
          href="/student/dashboard"
          className="flex items-center gap-3 font-bold"
        >
          <span className="rounded-lg bg-blue-700 p-2 text-white">
            <GraduationCap size={20} />
          </span>
          PolyMate
        </Link>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="student-sidebar"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-[#223553]"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
        />
      )}

      <aside
        id="student-sidebar"
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col
          border-r border-slate-300 bg-white
          text-slate-800 dark:border-[#30415D]
          dark:bg-[#0F1D38] dark:text-[#F1F5F9]
          transform-gpu transition-transform
          duration-200 ease-out
          motion-reduce:transition-none
          md:visible md:translate-x-0
          ${open ? "visible translate-x-0" : "invisible -translate-x-full"}
        `}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-300 px-5 dark:border-[#30415D]">
          <Link
            href="/student/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3"
          >
            <span className="rounded-xl bg-blue-700 p-2 text-white">
              <GraduationCap size={22} />
            </span>
            <span className="text-xl font-bold">PolyMate</span>
          </Link>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav
          aria-label="Student navigation"
          className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-3"
        >
          <p className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Student Portal
          </p>

          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`
                  flex min-h-11 items-center gap-3 rounded-xl
                  px-4 py-3 text-sm font-medium
                  transition-colors duration-150
                  motion-reduce:transition-none
                  ${
                    active
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "text-slate-600 hover:bg-slate-100 dark:text-[#CBD5E1] dark:hover:bg-[#223553]"
                  }
                `}
              >
                <Icon size={19} strokeWidth={1.9} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-slate-300 p-3 dark:border-[#30415D]">
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}
