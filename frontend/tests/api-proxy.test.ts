import { describe, it, expect } from "vitest";
import { backendUnreachableBody, copyResponseHeaders, HOP_BY_HOP_HEADERS } from "@/lib/bff-proxy";

describe("API Proxy Helpers", () => {
  it("backendUnreachableBody should return BACKEND_UNREACHABLE code without detail", () => {
    const body = backendUnreachableBody();
    expect((body as any).detail).toBeUndefined();
    expect(body.error.code).toBe("BACKEND_UNREACHABLE");
    expect(body.error.message).toBe("The tutor service is not responding. Please try again.");
  });

  it("copyResponseHeaders should preserve set-cookie and strip hop-by-hop headers", () => {
    const response = new Response("ok", {
      headers: {
        "set-cookie": "access_token=foo; HttpOnly",
        "content-type": "application/json",
        connection: "keep-alive",
        "transfer-encoding": "chunked",
      },
    });

    const copiedHeaders = copyResponseHeaders(response);
    
    // Kept
    expect(copiedHeaders.get("set-cookie")).toBe("access_token=foo; HttpOnly");
    expect(copiedHeaders.get("content-type")).toBe("application/json");

    // Stripped
    expect(copiedHeaders.get("connection")).toBeNull();
    expect(copiedHeaders.get("transfer-encoding")).toBeNull();
    
    // Ensure set-cookie isn't accidentally in HOP_BY_HOP_HEADERS
    expect(HOP_BY_HOP_HEADERS.has("set-cookie")).toBe(false);
  });
});
