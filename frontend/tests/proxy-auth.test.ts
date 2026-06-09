import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("proxy auth guard", () => {
  beforeEach(() => {
    responseMocks.redirect.mockClear();
    responseMocks.next.mockClear();
  });

  it("redirects unauthenticated request to /dashboard -> /login", async () => {
    const { proxy } = await import("../proxy");

    proxy(request("/dashboard") as never);

    expect(responseMocks.redirect).toHaveBeenCalledWith(new URL("/login", "https://example.test/dashboard"));
  });

  it("redirects authenticated request to /login -> /dashboard", async () => {
    const { proxy } = await import("../proxy");

    proxy(request("/login", "token") as never);

    expect(responseMocks.redirect).toHaveBeenCalledWith(new URL("/dashboard", "https://example.test/login"));
  });

  it("passes through authenticated request to /dashboard", async () => {
    const { proxy } = await import("../proxy");

    proxy(request("/dashboard", "token") as never);

    expect(responseMocks.next).toHaveBeenCalled();
  });
});
