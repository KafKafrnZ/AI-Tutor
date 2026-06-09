import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock next/server before importing proxy ──────────────────────────────────

const responseMocks = vi.hoisted(() => ({
  redirect: vi.fn((url: URL) => ({ kind: "redirect", url: url.toString() })),
  next: vi.fn(() => ({ kind: "next" })),
}));

vi.mock("next/server", () => ({
  NextResponse: responseMocks,
}));

function request(pathname: string, token?: string) {
  return {
    cookies: {
      get: vi.fn(() => (token ? { value: token } : undefined)),
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
    proxy(request("/dashboard", "valid-token") as never);
    expect(responseMocks.next).toHaveBeenCalled();
    expect(responseMocks.redirect).not.toHaveBeenCalled();
  });

  it("passes through authenticated request to /explore", async () => {
    const { proxy } = await import("../proxy");
    proxy(request("/explore", "valid-token") as never);
    expect(responseMocks.next).toHaveBeenCalled();
    expect(responseMocks.redirect).not.toHaveBeenCalled();
  });
});

describe("proxy auth guard — auth route redirects", () => {
  beforeEach(() => {
    responseMocks.redirect.mockClear();
    responseMocks.next.mockClear();
  });

  it("redirects authenticated user on /login to /dashboard", async () => {
    const { proxy } = await import("../proxy");
    proxy(request("/login", "valid-token") as never);
    expect(responseMocks.redirect).toHaveBeenCalledWith(
      new URL("/dashboard", "https://example.test/login")
    );
  });

  it("redirects authenticated user on /signup to /dashboard", async () => {
    const { proxy } = await import("../proxy");
    proxy(request("/signup", "valid-token") as never);
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
