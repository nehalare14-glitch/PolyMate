import { auth } from "@/lib/firebase";

export type AuthTheme = "light" | "dark";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://polymate-1.onrender.com"
).replace(/\/+$/, "");

export async function getAuthTheme(
  signal?: AbortSignal
): Promise<AuthTheme> {
  const response = await fetch(
    `${API_URL}/api/settings/auth-theme`,
    {
      cache: "no-store",
      signal,
    }
  );

  if (!response.ok) {
    throw new Error("Unable to load authentication theme");
  }

  const data = await response.json();

  if (data.theme !== "light" && data.theme !== "dark") {
    throw new Error("Invalid authentication theme");
  }

  return data.theme;
}

export async function updateAuthTheme(
  theme: AuthTheme
): Promise<AuthTheme> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in as administrator");
  }

  const token = await user.getIdToken();

  const response = await fetch(
    `${API_URL}/api/admin/settings/auth-theme`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ theme }),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Unable to update authentication theme"
    );
  }

  if (data.theme !== "light" && data.theme !== "dark") {
    throw new Error("Invalid theme response");
  }

  return data.theme;
}
