import { auth } from "@/lib/firebase";

export async function fetchSecurePDF(
  endpoint: string,
  title: string,
  apiBase: string
): Promise<{ title: string; url: string }> {

  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in again.");
  }

  const token = await user.getIdToken();

  const response = await fetch(
    `${apiBase.replace(/\/$/, "")}${endpoint}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/pdf",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    throw new Error(
      data?.error || "Unable to open PDF."
    );
  }

  const contentType =
    response.headers.get("content-type") || "";

  if (!contentType.includes("application/pdf")) {
    throw new Error(
      `Expected PDF but received ${contentType || "unknown"} | HTTP ${response.status} | URL: ${response.url}`
    );
  }

  const blob = await response.blob();

  if (!blob.size) {
    throw new Error("The PDF document is empty.");
  }

  return {
    title,
    url: URL.createObjectURL(blob),
  };
}

export const PDF_API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";
