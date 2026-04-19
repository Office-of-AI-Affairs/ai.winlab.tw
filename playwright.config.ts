import { defineConfig, devices } from "@playwright/test";

const CI = Boolean(process.env.CI);
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Use *.pw.ts so bun's default *.spec.ts / *.test.ts globs leave e2e alone.
  testMatch: "**/*.pw.ts",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `bun run build && bun run start -- -p ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !CI,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
