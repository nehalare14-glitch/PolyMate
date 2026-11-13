"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FileUp,
  Files,
  GraduationCap,
  LayoutDashboard,
  Menu,
  UserRound,
  X,
} from "lucide-react";

import SignOutButton from "@/components/auth/SignOutButton";

const navigation = [
  {
    label: "Dashboard",
    href: "/faculty/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "My Subjects",
    href: "/faculty/subjects",
    icon: BookOpen,
  },
  {
    label: "Upload PDF",
    href: "/faculty/upload",
    icon: FileUp,
  },
  {
    label: "My Materials",
    href: "/faculty/materials",
    icon: Files,
  },
  
  {
    label: "My Profile",
    href: "/faculty/profile",
    icon: UserRound,
  },
];

export default function FacultySidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = navigation.map((item) => {
    const Icon = item.icon;
    const active =
      pathname === item.href ||
      pathname.startsWith(item.href + "/");

    return (
      <Link
        key={item.href} aria-current={active ? "page" : undefined}
        href={item.href}
        onClick={() => setOpen(false)}
        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
          active
            ? "bg-blue-600 text-white"
            : "text-slate-300 hover:bg-[#223553] hover:text-white"
        }`}
      >
        <Icon size={19} />
        {item.label}
      </Link>
    );
  });

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-300 bg-white px-4 dark:border-[#30415D] dark:bg-[#0F1D38] md:hidden">
        <Link
          href="/faculty/dashboard"
          className="flex items-center gap-2 font-bold"
        >
          <GraduationCap size={23} className="text-blue-500" />
          PolyMate Faculty
        </Link>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open} aria-controls="faculty-sidebar"
          className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-[#223553]"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
        />
      )}

      <aside id="faculty-sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col border-r border-[#30415D] bg-[#0F1D38] p-5 text-white transition-transform motion-reduce:transition-none md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center gap-3 px-2 sm:mb-10">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="absolute right-3 top-3 rounded-lg p-2 hover:bg-[#223553] md:hidden"
          >
            <X size={20} />
          </button>
          <div className="rounded-xl bg-blue-600 p-2">
            <GraduationCap size={25} />
          </div>
          <div>
            <p className="text-lg font-bold">PolyMate</p>
            <p className="text-xs text-slate-400">Faculty Portal</p>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto" aria-label="Faculty navigation">
          {links}
        </nav>

        <div className="border-t border-[#30415D] pt-4">
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}

