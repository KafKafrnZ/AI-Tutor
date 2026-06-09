import { describe, expect, it } from "vitest";

import { parseSseLine } from "@/lib/sse";

describe("SSE parser", () => {
  it("parses valid token line", () => {
    expect(parseSseLine('data: {"token": "hello"}')).toEqual({ token: "hello" });
  });

  it("parses legacy data token line", () => {
    expect(parseSseLine('data: {"data": "hello"}')).toEqual({ token: "hello" });
  });

  it("handles string payloads", () => {
    expect(parseSseLine('data: "hello"')).toEqual({ token: "hello" });
  });

  it("handles [DONE] sentinel", () => {
    expect(parseSseLine("data: [DONE]")).toEqual({ done: true });
  });

  it("ignores non-data lines", () => {
    expect(parseSseLine("event: ping")).toEqual({});
  });

  it("handles malformed JSON without throwing and returns raw payload as token", () => {
    expect(() => parseSseLine("data: {broken")).not.toThrow();
    // Non-JSON payloads fall back to raw token so plain-string SSE streams work
    expect(parseSseLine("data: {broken")).toEqual({ token: "{broken" });
  });

  it("treats plain-string sse-starlette tokens as raw tokens", () => {
    expect(parseSseLine("data: Hello world")).toEqual({ token: "Hello world" });
    expect(parseSseLine("data: Hello\\nworld")).toEqual({ token: "Hello\\nworld" });
  });

  it("skips empty lines silently", () => {
    expect(parseSseLine("")).toEqual({});
    expect(parseSseLine("   ")).toEqual({});
  });

  it("handles lines without 'data:' prefix", () => {
    expect(parseSseLine("id: 42")).toEqual({});
    expect(parseSseLine("retry: 3000")).toEqual({});
  });

  it("extracts token from nested object payload", () => {
    expect(parseSseLine('data: {"token": "Hello world"}')).toEqual({ token: "Hello world" });
  });
});
