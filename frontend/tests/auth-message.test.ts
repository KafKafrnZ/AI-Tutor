import { describe, expect, it } from "vitest";

import { messageFromAuthBody } from "@/components/auth/AuthCard";

describe("messageFromAuthBody", () => {
  it("uses the API message when present", () => {
    expect(
      messageFromAuthBody(
        { message: "Account created. Check your email to verify your account." },
        "Account created. You can sign in now."
      )
    ).toBe("Account created. Check your email to verify your account.");
  });

  it("falls back when the body has no message", () => {
    expect(messageFromAuthBody({}, "Check your email.")).toBe("Check your email.");
    expect(messageFromAuthBody(null, "Check your email.")).toBe("Check your email.");
  });
});
