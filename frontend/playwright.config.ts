import { defineConfig, devices } from "@playwright/test";
import path from "path";

const backend = path.resolve(__dirname, "..", "backend");

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  webServer: [
    {
      command: "python scripts/e2e_backend.py",
      cwd: backend,
      url: "http://127.0.0.1:8000/health",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        JWT_SECRET: "e2e-secret-not-for-production",
        SKIP_EMBEDDING_WARMUP: "1",
        REQUIRE_EMAIL_VERIFICATION: "false",
      },
    },
    {
      command: "node node_modules/next/dist/bin/next dev --port 3000",
      url: "http://127.0.0.1:3000",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        BACKEND_API_URL: "http://127.0.0.1:8000",
        NEXT_PUBLIC_API_URL: "/api",
      },
    },
  ],
});
