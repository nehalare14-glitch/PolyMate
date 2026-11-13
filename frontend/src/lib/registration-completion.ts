import { auth } from "./firebase";
import {
  getCurrentProfile,
  submitFacultyApplication,
  submitStudentRegistration,
} from "./auth-service";

type RegistrationIntent = {
  type: "student" | "faculty";
  fullName: string;
  institutionCode?: string;
  facultyBranch?: string;
};

type ProfileResponse = {
  user: {
    role: "student" | "faculty" | "admin";
    full_name?: string | null;
    institution_id?: number | null;
  };
};

export async function completeRegistration(): Promise<ProfileResponse> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in first.");
  }

  const key = `polymate-registration-${user.uid}`;

  const saved =
    localStorage.getItem(key) ??
    sessionStorage.getItem(key);

  let existing: ProfileResponse | null = null;

  try {
    existing = await getCurrentProfile() as ProfileResponse;
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes("Profile not found")
    ) {
      throw error;
    }
  }

  // Never overwrite a complete existing profile.
  if (
    existing &&
    (
      existing.user.role !== "student" ||
      (existing.user.full_name && existing.user.institution_id != null)
    )
  ) {
    return existing;
  }

  // Existing accounts remain accessible even if old
  // registration details are no longer in the browser.
  if (!saved) {
    if (existing && existing.user.role !== "student") {
      return existing;
    }

    throw new Error(
      "Your student registration is incomplete. Please contact support to restore your registered details."
    );
  }

  let intent: RegistrationIntent;

  try {
    intent = JSON.parse(saved);
  } catch {
    throw new Error("Invalid registration details.");
  }

  let response: ProfileResponse;

  if (intent.type === "faculty") {
    if (existing) return existing;

    if (!intent.facultyBranch) {
      throw new Error("Faculty branch is required.");
    }

    response = await submitFacultyApplication(
      intent.fullName,
      intent.facultyBranch
    ) as ProfileResponse;

  } else if (intent.type === "student") {
    response = await submitStudentRegistration(
      intent.fullName,
      intent.institutionCode ?? ""
    ) as ProfileResponse;

  } else {
    throw new Error("Invalid account type.");
  }

  localStorage.removeItem(key);
  sessionStorage.removeItem(key);

  return response;
}
