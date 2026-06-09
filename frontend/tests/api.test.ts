import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── fetchWithRefresh ────────────────────────────────────────────────────────

describe("fetchWithRefresh", () => {
  const API_URL = "/api";

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    // jsdom doesn't have window.location.assign by default
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the response directly when status is 200", async () => {
    const mockRes = new Response(JSON.stringify({ ok: true }), { status: 200 });
    vi.mocked(fetch).mockResolvedValueOnce(mockRes);

    const { fetchWithRefresh } = await import("../lib/api");
    const result = await fetchWithRefresh(`${API_URL}/stats`, { method: "GET" });

    expect(result.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries once after a silent token refresh on 401", async () => {
    const unauthorised = new Response(null, { status: 401 });
    const refreshOk = new Response(null, { status: 200 });
    const retryOk = new Response(JSON.stringify({ data: "ok" }), { status: 200 });

    vi.mocked(fetch)
      .mockResolvedValueOnce(unauthorised) // original request → 401
      .mockResolvedValueOnce(refreshOk)    // /auth/refresh   → 200
      .mockResolvedValueOnce(retryOk);     // retry request   → 200

    const { fetchWithRefresh } = await import("../lib/api");
    const result = await fetchWithRefresh(`${API_URL}/stats`, { method: "GET" });

    expect(result.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(3);
    // Second call must be the refresh endpoint
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain("/auth/refresh");
  });

  it("redirects to /login and throws when refresh itself returns 401", async () => {
    const unauthorised = new Response(null, { status: 401 });
    const refreshFailed = new Response(null, { status: 401 });

    vi.mocked(fetch)
      .mockResolvedValueOnce(unauthorised)
      .mockResolvedValueOnce(refreshFailed);

    const { fetchWithRefresh } = await import("../lib/api");

    await expect(
      fetchWithRefresh(`${API_URL}/stats`, { method: "GET" })
    ).rejects.toThrow("SESSION_EXPIRED");

    expect(window.location.href).toBe("/login");
  });

  it("passes credentials:include automatically", async () => {
    const mockRes = new Response(null, { status: 200 });
    vi.mocked(fetch).mockResolvedValueOnce(mockRes);

    const { fetchWithRefresh } = await import("../lib/api");
    await fetchWithRefresh(`${API_URL}/stats`, { method: "GET" });

    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options as RequestInit).credentials).toBe("include");
  });

  it("does not retry on non-401 errors (e.g. 500)", async () => {
    const serverError = new Response(null, { status: 500 });
    vi.mocked(fetch).mockResolvedValueOnce(serverError);

    const { fetchWithRefresh } = await import("../lib/api");
    const result = await fetchWithRefresh(`${API_URL}/stats`, { method: "GET" });

    expect(result.status).toBe(500);
    expect(fetch).toHaveBeenCalledTimes(1); // no retry on 500
  });
});
