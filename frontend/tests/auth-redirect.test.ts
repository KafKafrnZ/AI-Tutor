import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock next/server before importing proxy ──────────────────────────────────

const responseMocks = vi.hoisted(() => ({
  redirect: vi.fn((url: URL) => ({ kind: "redirect", url: url.toString() })),
  next: vi.fn(() => ({ kind: "next" })),
}));

vi.mock("next/server", () => ({
  NextResponse: responseMocks,
}));

// A real JWT-shaped token with exp=9999999999 (year 2286) so isTokenExpired() returns false
const VALID_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjo5OTk5OTk5OTk5fQ.fakesig";
const EXPIRED_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.fakesig";
const REFRESH = "refresh-cookie";

function request(pathname: string, access?: string, refresh?: string) {
  const jar: Record<string, string> = {};
  if (access) jar.access_token = access;
  if (refresh) jar.refresh_token = refresh;
  return {
    cookies: {
      get: vi.fn((name: string) => {
        const value = jar[name];
        return value ? { value } : undefined;
      }),
    },
    nextUrl: { pathname },
    url: `https://example.test${pathname}`,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("proxy auth guard — protected routes", () => {
  beforeEach(() => {
    responseMocks.redirect.mockClear();
    responseMocks.next.mockClear();
  });

  it("redirects unauthenticated /dashboard request to /login", async () => {
    const { proxy } = await import("../proxy");
    proxy(request("/dashboard") as never);
    expect(responseMocks.redirect).toHaveBeenCalledWith(
      new URL("/login", "https://example.test/dashboard")
    );
  });

  it("redirects unauthenticated /explore request to /login", async () => {
    const { proxy } = await import("../proxy");
    proxy(request("/explore") as never);
    expect(responseMocks.redirect).toHaveBeenCalledWith(
      new URL("/login", "https://example.test/explore")
    );
  });

  it("redirects unauthenticated /practice request to /login", async () => {
    const { proxy } = await import("../proxy");
    proxy(request("/practice") as never);
    expect(responseMocks.redirect).toHaveBeenCalledWith(
      new URL("/login", "https://example.test/practice")
    );
  });

  it("redirects unauthenticated /progress request to /login", async () => {
    const { proxy } = await import("../proxy");
    proxy(request("/progress") as never);
    expect(responseMocks.redirect).toHaveBeenCalledWith(
      new URL("/login", "https://example.test/progress")
    );
  });

  it("passes through authenticated request to /dashboard", async () => {
    const { proxy } = await import("../proxy");
    proxy(request("/dashboard", VALID_TOKEN) as never);
    expect(responseMocks.next).toHaveBeenCalled();
    expect(responseMocks.redirect).not.toHaveBeenCalled();
  });

  it("passes through authenticated request to /explore", async () => {
    const { proxy } = await import("../proxy");
    proxy(request("/explore", VALID_TOKEN) as never);
    expect(responseMocks.next).toHaveBeenCalled();
    expect(responseMocks.redirect).not.toHaveBeenCalled();
  });

  it("lets an expired access token through when a refresh cookie is present", async () => {
    const { proxy } = await import("../proxy");
    proxy(request("/dashboard", EXPIRED_TOKEN, REFRESH) as never);
    expect(responseMocks.next).toHaveBeenCalled();
    expect(responseMocks.redirect).not.toHaveBeenCalled();
  });

  it("lets a missing access token through when a refresh cookie is present", async () => {
    const { proxy } = await import("../proxy");
    proxy(request("/dashboard", undefined, REFRESH) as never);
    expect(responseMocks.next).toHaveBeenCalled();
    expect(responseMocks.redirect).not.toHaveBeenCalled();
  });

  it("redirects expired access with no refresh cookie to /login", async () => {
    const { proxy } = await import("../proxy");
    proxy(request("/dashboard", EXPIRED_TOKEN) as never);
    expect(responseMocks.redirect).toHaveBeenCalledWith(
      new URL("/login", "https://example.test/dashboard")
    );
  });
});

describe("proxy auth guard — auth route redirects", () => {
  beforeEach(() => {
    responseMocks.redirect.mockClear();
    responseMocks.next.mockClear();
  });

  it("redirects authenticated user on /login to /dashboard", async () => {
    const { proxy } = await import("../proxy");
    proxy(request("/login", VALID_TOKEN) as never);
    expect(responseMocks.redirect).toHaveBeenCalledWith(
      new URL("/dashboard", "https://example.test/login")
    );
  });

  it("redirects authenticated user on /signup to /dashboard", async () => {
    const { proxy } = await import("../proxy");
    proxy(request("/signup", VALID_TOKEN) as never);
    expect(responseMocks.redirect).toHaveBeenCalledWith(
      new URL("/dashboard", "https://example.test/signup")
    );
  });

  it("allows unauthenticated access to /login", async () => {
    const { proxy } = await import("../proxy");
    proxy(request("/login") as never);
    expect(responseMocks.next).toHaveBeenCalled();
    expect(responseMocks.redirect).not.toHaveBeenCalled();
  });

  it("redirects /login to /dashboard when only a refresh cookie remains", async () => {
    const { proxy } = await import("../proxy");
    proxy(request("/login", undefined, REFRESH) as never);
    expect(responseMocks.redirect).toHaveBeenCalledWith(
      new URL("/dashboard", "https://example.test/login")
    );
  });
});

describe("proxy auth guard — public routes", () => {
  beforeEach(() => {
    responseMocks.redirect.mockClear();
    responseMocks.next.mockClear();
  });

  it("passes through /api/* regardless of auth state", async () => {
    const { proxy } = await import("../proxy");
    proxy(request("/api/health") as never);
    expect(responseMocks.next).toHaveBeenCalled();
    expect(responseMocks.redirect).not.toHaveBeenCalled();
  });

  it("passes through the root / regardless of auth state", async () => {
    const { proxy } = await import("../proxy");
    proxy(request("/") as never);
    expect(responseMocks.next).toHaveBeenCalled();
    expect(responseMocks.redirect).not.toHaveBeenCalled();
  });
});
