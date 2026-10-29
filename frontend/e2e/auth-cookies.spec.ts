import { createHmac } from "crypto";
import { expect, test, type BrowserContext } from "@playwright/test";

const JWT_SECRET = "e2e-secret-not-for-production";
const PASSWORD = "E2ePass1";

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const body = encode(payload);
  const sig = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

async function expireAccessToken(context: BrowserContext, email: string) {
  await context.addCookies([
    {
      name: "access_token",
      value: jwt({ sub: email, exp: 1 }),
      url: "http://127.0.0.1:3000",
      httpOnly: true,
    },
  ]);
}

test("login cookies survive an expired access JWT", async ({ page, context, request }) => {
  const email = `e2e.${Date.now()}@example.com`;

  const signup = await request.post("http://127.0.0.1:8000/signup", {
    json: { name: "E2E Operator", email, password: PASSWORD },
  });
  expect(signup.ok()).toBeTruthy();

  await page.goto("/login");
  await page.getByLabel("Access ID").fill(email);
  await page.getByLabel("Passphrase").fill(PASSWORD);
  await page.getByRole("button", { name: /breach account/i }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /kaer morhen/i })).toBeVisible();

  const cookies = await context.cookies("http://127.0.0.1:3000");
  expect(cookies.some((c) => c.name === "access_token")).toBeTruthy();
  expect(cookies.some((c) => c.name === "refresh_token")).toBeTruthy();

  await expireAccessToken(context, email);
  await page.goto("/progress");

  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: /command center/i })).toBeVisible();
});
