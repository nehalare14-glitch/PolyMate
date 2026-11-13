export type UserRole =
  | "student"
  | "faculty"
  | "admin";

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case "student":
      return "/student/dashboard";

    case "faculty":
      return "/faculty/dashboard";

    case "admin":
      return "/admin/dashboard";

    default:
      throw new Error("Unknown user role");
  }
}
