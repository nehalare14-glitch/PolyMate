import FacultySidebar from "@/components/faculty/FacultySidebar";

export default function FacultyPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#F6F8FC] text-slate-900 dark:bg-[#0B1220] dark:text-slate-100">
      <FacultySidebar />
      <main className="px-4 pb-12 pt-24 sm:px-6 md:ml-72 md:px-8 md:pt-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
