import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";

import { auth } from "./firebase";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000";

export async function registerStudent(
  email: string,
  password: string
) {
  const result = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  try {
    await sendEmailVerification(result.user);
  } finally {
    await signOut(auth);
  }

  return {
    message: "Account created. Check your email for verification.",
  };
}

async function getVerifiedToken() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You are not signed in.");
  }

  await user.reload();

  if (!user.emailVerified) {
    throw new Error(
      "Your email is not verified in Firebase. Please verify your email using the verification link, then sign in again."
    );
  }

  return user.getIdToken(true);
}

async function apiRequest(path: string, method = "GET") {
  const token = await getVerifiedToken();

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }

  return data;
}

export async function loginWithEmail(
  email: string,
  password: string
) {
  await signInWithEmailAndPassword(auth, email, password);

  try {
    return await apiRequest("/api/me");
  } catch (error) {
    const verificationRequired =
      error instanceof Error &&
      (error.message.includes("not verified") ||
       error.message.includes("verify your email"));

    const profileMissing =
      error instanceof Error &&
      error.message.includes("Profile not found");

    if (!verificationRequired && !profileMissing) {
      await signOut(auth);
    }

    throw error;
  }
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();

  await signInWithPopup(auth, provider);

  try {
    return await apiRequest("/api/me");
  } catch (error) {
    const verificationRequired =
      error instanceof Error &&
      (error.message.includes("not verified") ||
       error.message.includes("verify your email"));

    const profileMissing =
      error instanceof Error &&
      error.message.includes("Profile not found");

    if (!verificationRequired && !profileMissing) {
      await signOut(auth);
    }

    throw error;
  }
}

export async function getCurrentProfile() {
  return apiRequest("/api/me");
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function logout() {
  await signOut(auth);
}


export async function resendVerificationEmail() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in first.");
  }

  await user.reload();

  if (user.emailVerified) {
    return "Your email is already verified.";
  }

  await sendEmailVerification(user);

  return "Verification email sent. Check your inbox and spam folder.";
}



export async function submitFacultyApplication(fullName: string, facultyBranch: string) {
  const name = fullName.trim();

  if (name.length < 2 || name.length > 80) {
    throw new Error("Full name must contain 2 to 80 characters.");
  }

  const allowedBranches = ["CSE", "ECE", "EEE", "MEC", "CIVIL", "AIML", "CCP"];

  if (!allowedBranches.includes(facultyBranch)) {
    throw new Error("Please select a valid faculty branch.");
  }

  const token = await getVerifiedToken();

  const response = await fetch(
    `${API_URL}/api/auth/register/faculty`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ full_name: name, faculty_branch: facultyBranch }),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Faculty application failed.");
  }

  return data;
}

export async function submitStudentRegistration(
  fullName: string,
  institutionCode: string
) {
  const name = fullName.trim();
  const code = institutionCode.trim();

  if (name.length < 2 || name.length > 80) {
    throw new Error("Full name must contain 2 to 80 characters.");
  }

  if (!code) {
    throw new Error("Please select your institution.");
  }

  const user = auth.currentUser;

  if (!user) {
    throw new Error("You are not signed in.");
  }

  // Registration may save a profile before email verification.
  const token = await user.getIdToken(true);

  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      full_name: name,
      institution_code: code,
    }),
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Student registration failed.");
  }

  return data;
}




export async function getRecentStudentMaterials() {
  return apiRequest("/api/student/materials/recent");
}

export async function getStudentMaterialPreview(id: string) {
  return apiRequest(
    `/api/student/materials/${encodeURIComponent(id)}/preview`
  );
}

export type BookmarkedMaterial = {
  id: string;
  title: string;
  subject_name: string;
  branch: string;
  semester: number;
  material_type: "notes" | "question-paper";
  created_at: string;
  bookmark_id: string;
  bookmarked_at: string;
};

export type BookmarksResponse = {
  bookmarks: BookmarkedMaterial[];
  total: number;
  page: number;
  limit: number;
};

export async function getStudentBookmarks(
  materialType?: "notes" | "question-paper",
  page = 1,
  limit = 12
): Promise<BookmarksResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (materialType) {
    params.set("material_type", materialType);
  }

  return apiRequest(
    `/api/student/bookmarks?${params.toString()}`
  );
}

export async function saveStudentBookmark(id: string) {
  return apiRequest(
    `/api/student/bookmarks/${encodeURIComponent(id)}`,
    "POST"
  );
}

export async function removeStudentBookmark(id: string) {
  return apiRequest(
    `/api/student/bookmarks/${encodeURIComponent(id)}`,
    "DELETE"
  );
}

export async function getStudentBookmarkIds(): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const result = await getStudentBookmarks(
      undefined,
      page,
      limit
    );

    ids.push(...result.bookmarks.map(item => item.id));

    if (
      result.bookmarks.length < limit ||
      ids.length >= result.total
    ) {
      break;
    }

    page++;
  }

  return ids;
}
