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

export function messageFromApiBody(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const body = data as ApiErrorBody;
  return (
    messageFromValue(body.error) ||
    messageFromValue(body.detail) ||
    messageFromValue(body.message) ||
    fallback
  );
}

export async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = (await response.json()) as ApiErrorBody;
      return messageFromApiBody(data, fallback);
    }

    const text = await response.text();
    return text.trim() || fallback;
  } catch {
    return fallback;
  }
}

// ponytail: one in-flight refresh per tab. Concurrent 401s (layout /me + page
// fetch) would otherwise rotate the refresh cookie twice and log the user out.
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" })
      .then((res) => res.ok)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export async function fetchWithRefresh(url: string, options: RequestInit): Promise<Response> {
  let res = await fetch(url, { ...options, credentials: "include" });
  if (res.status === 401) {
    const ok = await refreshSession();
    if (ok) {
      res = await fetch(url, { ...options, credentials: "include" });
    } else {
      window.location.href = "/login";
      throw new Error("SESSION_EXPIRED");
    }
  }
  return res;
}

export function apiConnectionErrorMessage(): string {
  if (API_URL.startsWith("http://127.0.0.1") || API_URL.startsWith("http://localhost")) {
    return "Cannot connect to the local FastAPI server. Make sure it is running on port 8000.";
  }

  return "Cannot reach the backend API. The frontend is live, but the server is not responding.";
}
