import { describe, expect, it } from "vitest";

import { usesAppChrome } from "@/app/AppLayout";

describe("usesAppChrome", () => {
  it("keeps chrome on dashboard, list, and progress", () => {
    expect(usesAppChrome("/dashboard")).toBe(true);
    expect(usesAppChrome("/mock-tests")).toBe(true);
    expect(usesAppChrome("/progress")).toBe(true);
    expect(usesAppChrome("/billing")).toBe(true);
  });

  it("drops chrome on immersive chambers", () => {
    expect(usesAppChrome("/tutor")).toBe(false);
    expect(usesAppChrome("/practice")).toBe(false);
    expect(usesAppChrome("/explore")).toBe(false);
    expect(usesAppChrome("/mock-tests/1")).toBe(false);
  });

  it("drops chrome on public auth routes", () => {
    expect(usesAppChrome("/login")).toBe(false);
    expect(usesAppChrome("/")).toBe(false);
  });
});
