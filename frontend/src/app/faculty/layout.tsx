import type { ReactNode } from "react";
import RoleGuard from "@/components/auth/RoleGuard";

export default function FacultyLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["faculty"]}>
      {children}
    </RoleGuard>
  );
}
