export const instant = false;

import type { ReactNode } from "react";
import RoleGuard from "@/components/auth/RoleGuard";

export default function RoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["student"]}>
      {children}
    </RoleGuard>
  );
}

