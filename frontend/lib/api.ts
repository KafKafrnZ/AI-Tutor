export const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

type ApiErrorBody = {
  detail?: unknown;
  error?: unknown;
  message?: unknown;
};

function messageFromValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (value && typeof value === "object" && "message" in value) {
    return messageFromValue((value as { message?: unknown }).message);
  }

  if (Array.isArray(value)) {
    const first = value[0] as { msg?: unknown } | undefined;
    return messageFromValue(first?.msg);
  }

  return null;
}

export async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = (await response.json()) as ApiErrorBody;
      return (
        messageFromValue(data.error) ||
        messageFromValue(data.detail) ||
        messageFromValue(data.message) ||
        fallback
      );
    }

    const text = await response.text();
    return text.trim() || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchWithRefresh(url: string, options: RequestInit): Promise<Response> {
  let res = await fetch(url, { ...options, credentials: "include" })
  if (res.status === 401) {
    const refresh = await fetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" })
    if (refresh.ok) {
      res = await fetch(url, { ...options, credentials: "include" })
    } else {
      window.location.href = "/login"
      throw new Error("SESSION_EXPIRED")
    }
  }
  return res
}

export function apiConnectionErrorMessage(): string {
  if (API_URL.startsWith("http://127.0.0.1") || API_URL.startsWith("http://localhost")) {
    return "Cannot connect to the local FastAPI server. Make sure it is running on port 8000.";
  }

  return "Cannot reach the backend API. The frontend is live, but the server is not responding.";
}
