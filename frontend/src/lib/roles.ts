export type UserRole =
  | "student"
  | "faculty"
  | "admin"
  | "super_admin";

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case "student":
      return "/student/dashboard";

    case "faculty":
      return "/faculty/dashboard";

    case "admin":
      return "/admin/dashboard";

    case "super_admin":
      return "/super-admin/dashboard";

    default:
      throw new Error("Unknown user role");
  }
}
